const log = {
  _prefix: (level) => {
    const ts = new Date().toISOString().slice(11, 23)
    return `[${ts}] [${level}] [popup]`
  },
  debug: (...args) => console.debug(log._prefix('DEBUG'), ...args),
  info: (...args) => console.info(log._prefix('INFO'), ...args),
  warn: (...args) => console.warn(log._prefix('WARN'), ...args),
  error: (...args) => console.error(log._prefix('ERROR'), ...args),
}

const $ = (id) => document.getElementById(id)
const API_PAGE_SIZE = 20

const BACKEND_URL = (SCALEFISH_CONFIG.BACKEND_URL || '').replace(/\/+$/, '')
const HOME_URL = SCALEFISH_CONFIG.HOME_URL || ''

// 与网站一致的登录策略：
// - accessToken 只保存在内存中（过期时间很短），每次打开弹窗通过 refreshToken 换取
// - refreshToken 是 HttpOnly Cookie（refresh_token），浏览器在同源请求中自动携带，
//   扩展与网站共享 Cookie，用户在网站登录后扩展即可直接使用
let accessToken = ''
let currentUser = null
let refreshPromise = null

let state = {
  currentTab: 'bookmarks',
  categories: [],
  tags: [],
  bookmarkPage: 0,
  bookmarkTotalPages: 0,
  bookmarkLoading: false,
  momentPage: 0,
  momentLoading: false,
  hasMoreMoments: true,
  searchTerm: '',
  searchLoading: false,
  filterCategoryId: '',
  filterTagId: '',
  advancedOpen: false,
}

// ===== Session (cookie-based, same as website) =====
async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const data = json.data || json
      if (!data.accessToken) throw new Error('refresh 响应中未找到 token')
      accessToken = data.accessToken
      currentUser = data.user || null
      return true
    })().finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

function openHome() {
  if (HOME_URL) chrome.tabs.create({ url: HOME_URL })
}

function showLoggedOut() {
  accessToken = ''
  currentUser = null
  showView('loggedOutView')
}

async function logout() {
  try {
    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    log.debug('Logout request failed:', e.message)
  }
  accessToken = ''
  currentUser = null
  showLoggedOut()
}

/**
 * 带鉴权的 fetch：自动携带 Cookie 与 Bearer token，401 时自动刷新一次重试。
 */
async function authFetch(url, options = {}) {
  const doFetch = () => fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  let res = await doFetch()
  if (res.status === 401 || res.status === 403) {
    log.debug('Got %d, refreshing session...', res.status)
    await refreshSession()
    res = await doFetch()
  }
  return res
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  let res
  try {
    res = await authFetch(`${BACKEND_URL}${path}`, { ...options, headers })
  } catch (e) {
    showLoggedOut()
    throw e
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    log.warn('API failed: %d %s', res.status, body)
    const err = new Error(`HTTP ${res.status}: ${body}`)
    err.status = res.status
    throw err
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// 图片/文件等二进制资源：鉴权下载后转为 blob URL
const objectUrls = new Set()
function trackObjectUrl(url) {
  objectUrls.add(url)
  return url
}
function revokeObjectUrl(url) {
  if (url && objectUrls.has(url)) {
    URL.revokeObjectURL(url)
    objectUrls.delete(url)
  }
}

async function loadAuthedBlob(path) {
  const res = await authFetch(`${BACKEND_URL}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.blob()
}

async function setAuthedImg(imgEl, path) {
  const oldUrl = imgEl.dataset.objectUrl
  try {
    const blob = await loadAuthedBlob(path)
    const url = trackObjectUrl(URL.createObjectURL(blob))
    imgEl.src = url
    imgEl.dataset.objectUrl = url
    if (oldUrl) revokeObjectUrl(oldUrl)
  } catch (e) {
    log.warn('Failed to load image %s: %s', path, e.message)
  }
}

async function downloadAuthed(path, filename) {
  const blob = await loadAuthedBlob(path)
  const url = trackObjectUrl(URL.createObjectURL(blob))
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'download'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => revokeObjectUrl(url), 60000)
}

// ===== View Switching =====
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  $(viewId).classList.add('active')
}

// ===== Main View Init =====
async function enterMainView() {
  showView('mainView')
  renderUser()
  loadCategoriesForFilter()
  switchTab('bookmarks')
  $('searchInput').focus()
}

function renderUser() {
  const user = currentUser || {}
  const name = user.name || user.nickname || user.username || user.email || ''
  const initial = name.charAt(0).toUpperCase() || '?'
  $('topbarAvatar').textContent = initial
  $('topbarUsername').textContent = name || '已登录'
  $('topbarUser').title = name ? `${name} - 点击打开主页` : '点击打开主页'
}

// ===== Tab Switching =====
const TAB_LABELS = {
  bookmarks: '书签',
  moments: '时刻',
  overview: '概览',
}

function switchTab(tab) {
  state.currentTab = tab
  document.querySelectorAll('.bottom-menu button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab))
  document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('active', el.id === `tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`))

  $('topbarTabName').textContent = TAB_LABELS[tab] || tab

  if (tab === 'bookmarks' && !state.bookmarkLoading) {
    const grid = $('bookmarkGrid')
    if (!grid.children.length) loadBookmarks(true)
  } else if (tab === 'moments' && !state.momentLoading) {
    const list = $('momentList')
    if (!list.children.length) loadMoments(true)
  } else if (tab === 'overview') {
    loadOverview()
  }

  $('headerArea').style.display = tab === 'bookmarks' ? 'flex' : 'none'
  if (tab !== 'bookmarks') resetQuickAdd()
}

$('topbarUser').addEventListener('click', openHome)

$('topbarLogo').addEventListener('click', openHome)

async function fillCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab) {
      $('qaUrl').value = tab.url || ''
      $('qaTitle').value = tab.title || ''
    }
  } catch (e) {
    log.debug('Failed to get current tab:', e.message)
  }
}

$('addNewBtn').addEventListener('click', () => {
  if (state.currentTab === 'bookmarks') {
    const form = $('quickAdd')
    if (!form.classList.contains('open')) {
      form.classList.add('open')
      fillCurrentTab()
      $('qaUrl').focus()
    } else {
      form.classList.remove('open')
    }
  } else if (state.currentTab === 'moments') {
    const form = $('momentQuickAdd')
    if (!form.classList.contains('open')) {
      form.classList.add('open')
      $('maContent').focus()
    } else {
      resetMomentAdd()
    }
  } else {
    openHome()
  }
})

// ===== Moment Quick Add =====
$('maCancel').addEventListener('click', resetMomentAdd)

function resetMomentAdd() {
  $('momentQuickAdd').classList.remove('open')
  $('maContent').value = ''
  $('maFileInput').value = ''
  $('maPreview').style.display = 'none'
  if ($('maPreviewImg').dataset.objectUrl) {
    revokeObjectUrl($('maPreviewImg').dataset.objectUrl)
    $('maPreviewImg').removeAttribute('data-object-url')
  }
  $('maPreviewImg').src = ''
  $('maLocked').checked = false
  $('maFileLabel').textContent = '点击选择文件（可选）'
  $('maSave').disabled = false
  $('maSave').textContent = '新增'
}

$('maDropzone').addEventListener('click', () => $('maFileInput').click())
$('maFileInput').addEventListener('change', () => {
  const file = $('maFileInput').files[0]
  if (!file) return
  $('maFileLabel').textContent = file.name
  if (file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      $('maPreviewImg').src = e.target.result
      $('maPreview').style.display = 'block'
    }
    reader.readAsDataURL(file)
  } else {
    $('maPreview').style.display = 'none'
  }
})
$('maFileRemoveBtn').addEventListener('click', (e) => {
  e.stopPropagation()
  $('maFileInput').value = ''
  $('maPreview').style.display = 'none'
  $('maPreviewImg').src = ''
  $('maFileLabel').textContent = '点击选择文件（可选）'
})

$('maContent').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doMomentAdd() }
})

$('maSave').addEventListener('click', doMomentAdd)

async function doMomentAdd() {
  const content = $('maContent').value.trim()
  if (!content) return

  const file = $('maFileInput').files[0]
  const isLocked = $('maLocked').checked

  $('maSave').disabled = true
  $('maSave').textContent = '提交中…'
  try {
    if (file) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('terminalType', 'WEB')
      formData.append('isLocked', String(isLocked))
      if (isLocked) formData.append('displayContent', '******')
      const res = await authFetch(`${BACKEND_URL}/moments/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body}`)
      }
    } else {
      await api('/moments', {
        method: 'POST',
        body: JSON.stringify({
          content,
          contentType: 'TEXT',
          terminalType: 'WEB',
          isLocked,
          ...(isLocked ? { displayContent: '******' } : {}),
        }),
      })
    }
    resetMomentAdd()
    loadMoments(true)
  } catch (e) {
    log.error('Failed to create moment:', e.message)
  } finally {
    $('maSave').disabled = false
    $('maSave').textContent = '新增'
  }
}

$('qaCancel').addEventListener('click', resetQuickAdd)

function resetQuickAdd() {
  $('quickAdd').classList.remove('open')
  $('qaTitle').value = ''
  $('qaUrl').value = ''
  $('qaCategory').value = ''
  $('qaTag').value = ''
  $('qaNewCat').value = ''
  $('qaNewCat').classList.remove('open')
  $('qaNewTag').value = ''
  $('qaNewTag').classList.remove('open')
}

async function createItem(apiPath, name) {
  const res = await api(apiPath, { method: 'POST', body: JSON.stringify({ name }) })
  return res.data
}

async function doQuickAdd() {
  const title = $('qaTitle').value.trim()
  const url = $('qaUrl').value.trim()
  if (!title || !url) return

  let categoryId = $('qaCategory').value ? Number($('qaCategory').value) : undefined
  let tagIds = $('qaTag').value ? [Number($('qaTag').value)] : []
  const newCatName = $('qaNewCat').value.trim()
  const newTagName = $('qaNewTag').value.trim()

  $('qaSave').disabled = true
  try {
    if (newCatName) {
      const parentId = $('qaCategory').value ? Number($('qaCategory').value) : undefined
      const catBody = { name: newCatName }
      if (parentId) catBody.parentId = parentId
      const cat = await api('/categories', { method: 'POST', body: JSON.stringify(catBody) })
      categoryId = cat.data?.id || cat.id
    }
    if (newTagName) {
      const tag = await createItem('/tags', newTagName)
      tagIds = [tag.id]
    }
    await api('/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ title, url, categoryId, tagIds }),
    })
    resetQuickAdd()
    loadCategoriesForFilter()
    loadBookmarks(true)
  } catch (e) {
    log.error('Failed to create bookmark:', e.message)
  } finally {
    $('qaSave').disabled = false
  }
}

$('qaSave').addEventListener('click', doQuickAdd)
$('qaUrl').addEventListener('keydown', e => { if (e.key === 'Enter') doQuickAdd() })
$('qaTitle').addEventListener('keydown', e => { if (e.key === 'Enter') doQuickAdd() })

$('qaAddCatBtn').addEventListener('click', () => {
  $('qaNewCat').classList.toggle('open')
  if ($('qaNewCat').classList.contains('open')) $('qaNewCat').focus()
})
$('qaAddTagBtn').addEventListener('click', () => {
  $('qaNewTag').classList.toggle('open')
  if ($('qaNewTag').classList.contains('open')) $('qaNewTag').focus()
})

$('qaNewCat').addEventListener('keydown', e => {
  if (e.key === 'Escape') { $('qaNewCat').value = ''; $('qaNewCat').classList.remove('open') }
})
$('qaNewTag').addEventListener('keydown', e => {
  if (e.key === 'Escape') { $('qaNewTag').value = ''; $('qaNewTag').classList.remove('open') }
})

$('popoutBtn').addEventListener('click', () => {
  chrome.windows.create({
    url: chrome.runtime.getURL('popup.html'),
    type: 'popup',
    width: 420,
    height: 620,
  })
})

// ===== Logged out view =====
$('loginGoBtn').addEventListener('click', openHome)
$('loginRetryBtn').addEventListener('click', initSession)

// ===== Bookmarks =====
function setSearchLoading(loading) {
  state.searchLoading = loading
  const btn = $('searchBtn')
  if (loading) {
    btn.disabled = true
    btn.classList.add('spinner')
  } else {
    btn.disabled = false
    btn.classList.remove('spinner')
  }
}

async function performSearch() {
  state.searchTerm = $('searchInput').value.trim()
  state.bookmarkPage = 0
  setSearchLoading(true)
  try {
    await loadBookmarks(true)
  } finally {
    setSearchLoading(false)
  }
}

let searchTimer = null
$('searchInput').addEventListener('input', () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(performSearch, 1000)
})
$('searchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    clearTimeout(searchTimer)
    performSearch()
  }
})

$('toggleAdvancedBtn').addEventListener('click', () => {
  state.advancedOpen = !state.advancedOpen
  $('advancedSearch').classList.toggle('open', state.advancedOpen)
  $('toggleAdvancedBtn').classList.toggle('active', state.advancedOpen)
})

$('filterCategory').addEventListener('change', () => {
  state.filterCategoryId = $('filterCategory').value
  state.bookmarkPage = 0
  loadBookmarks(true)
})

$('filterTag').addEventListener('change', () => {
  state.filterTagId = $('filterTag').value
  state.bookmarkPage = 0
  loadBookmarks(true)
})

async function loadBookmarks(reset) {
  if (state.bookmarkLoading) return
  state.bookmarkLoading = true
  $('bmLoading').style.display = 'block'

  if (reset) {
    state.bookmarkPage = 0
    $('bookmarkGrid').innerHTML = ''
    $('bmLoadMore').style.display = 'none'
    $('bmPagination').style.display = 'none'
  }

  try {
    const params = new URLSearchParams({ page: state.bookmarkPage, size: API_PAGE_SIZE })
    if (state.searchTerm) params.set('keyword', state.searchTerm)
    if (state.filterCategoryId) params.set('categoryIds', state.filterCategoryId)
    if (state.filterTagId) params.set('tagIds', state.filterTagId)

    const res = await api(`/bookmarks?${params}`)
    const data = res.data
    state.bookmarkTotalPages = data.totalPages
    const grid = $('bookmarkGrid')

    if (data.content && data.content.length) {
      data.content.forEach(bm => grid.appendChild(createBookmarkCard(bm)))
    }

    if (data.totalPages > state.bookmarkPage + 1) {
      $('bmLoadMore').style.display = 'block'
    } else {
      $('bmLoadMore').style.display = 'none'
    }

    if (data.totalElements > 0) {
      $('bmPagination').style.display = 'block'
      $('bmPagination').textContent = `共 ${data.totalElements} 条`
    }

    if (!grid.children.length) {
      grid.innerHTML = '<div class="empty-state">暂无书签</div>'
    }
  } catch (e) {
    log.error('Failed to load bookmarks:', e.message)
    $('bookmarkGrid').innerHTML = `<div class="empty-state">加载失败: ${e.message}</div>`
  } finally {
    state.bookmarkLoading = false
    $('bmLoading').style.display = 'none'
  }
}

$('bmLoadMoreBtn').addEventListener('click', () => {
  state.bookmarkPage++
  loadBookmarks(false)
})

function createBookmarkCard(bm) {
  const card = document.createElement('div')
  card.className = 'bookmark-card'
  const id = bm.id

  let tagsHtml = ''
  if (bm.category) {
    tagsHtml += `<span class="cat-tag">${escapeHtml(bm.category.name)}</span>`
  }
  if (bm.tags && bm.tags.length) {
    bm.tags.forEach(t => {
      tagsHtml += `<span># ${escapeHtml(t.name)}</span>`
    })
  }

  const pinIcon = svg('paperclip', 13)
  const pinClass = bm.pinned ? 'pinned' : ''

  card.innerHTML = `
    <div class="bm-title">${escapeHtml(bm.title)}${bm.pinned ? `<span class="bm-pin-badge">${svg('paperclip', 12)} 置顶</span>` : ''}</div>
    <div class="bm-url">${escapeHtml(bm.url || '')}</div>
    <div class="bm-meta">${tagsHtml}</div>
    <div class="bm-actions">
      <button class="action-open" title="打开">${svg('external', 15)}</button>
      <button class="action-pin ${pinClass}" title="${bm.pinned ? '取消置顶' : '置顶'}">${pinIcon}</button>
      <button class="action-edit" title="编辑">${svg('edit', 15)}</button>
      <button class="action-delete" title="删除">${svg('trash', 15)}</button>
    </div>
  `

  card.querySelector('.action-open')?.addEventListener('click', async (e) => {
    e.stopPropagation()
    if (bm.url) {
      chrome.tabs.create({ url: bm.url })
      try { await api(`/bookmarks/${id}/click`, { method: 'POST' }) } catch (_) {}
    }
  })

  card.querySelector('.action-pin')?.addEventListener('click', async (e) => {
    e.stopPropagation()
    try {
      await api(`/bookmarks/${id}/pin`, { method: 'PATCH' })
      loadBookmarks(true)
    } catch (e) {
      log.error('Pin toggle failed:', e.message)
    }
  })

  card.querySelector('.action-edit')?.addEventListener('click', async (e) => {
    e.stopPropagation()
    openEditBookmark(bm)
  })

  card.querySelector('.action-delete')?.addEventListener('click', async (e) => {
    e.stopPropagation()
    if (!(await confirmAsync('确认删除', `确定要删除"${bm.title}"？`))) return
    try {
      await api(`/bookmarks/${id}`, { method: 'DELETE' })
      loadBookmarks(true)
    } catch (e) {
      log.error('Delete failed:', e.message)
    }
  })

  if (bm.url) {
    card.addEventListener('click', () => chrome.tabs.create({ url: bm.url }))
  }

  return card
}

// ===== Edit Bookmark Modal =====
let editingBookmarkId = null

function populateEditCategories() {
  const sel = $('ebmCategory')
  sel.innerHTML = '<option value="">选择分类</option>'
  state.categories.forEach(c => {
    const opt = document.createElement('option')
    opt.value = c.id
    opt.textContent = c.label || c.name
    sel.appendChild(opt)
  })
}

function openEditBookmark(bm) {
  editingBookmarkId = bm.id
  $('ebmTitle').value = bm.title || ''
  $('ebmUrl').value = bm.url || ''
  $('ebmDesc').value = bm.description || ''
  populateEditCategories()
  $('ebmCategory').value = bm.category ? bm.category.id : ''

  const tagIds = new Set((bm.tags || []).map(t => t.id))
  const container = $('ebmTags')
  container.innerHTML = ''
  state.tags.forEach(t => {
    const btn = document.createElement('button')
    btn.className = 'ebm-tag-btn' + (tagIds.has(t.id) ? ' selected' : '')
    btn.textContent = t.name
    btn.dataset.id = t.id
    btn.addEventListener('click', () => btn.classList.toggle('selected'))
    container.appendChild(btn)
  })

  $('editBmModal').classList.add('open')
  $('ebmTitle').focus()
}

$('ebmCancel').addEventListener('click', () => {
  $('editBmModal').classList.remove('open')
  editingBookmarkId = null
})

$('ebmSave').addEventListener('click', async () => {
  const title = $('ebmTitle').value.trim()
  const url = $('ebmUrl').value.trim()
  const description = $('ebmDesc').value.trim()
  const categoryId = $('ebmCategory').value ? Number($('ebmCategory').value) : undefined
  const tagIds = Array.from($('ebmTags').querySelectorAll('.ebm-tag-btn.selected')).map(btn => Number(btn.dataset.id))
  if (!title || !url || !editingBookmarkId) return
  $('ebmSave').disabled = true
  try {
    await api(`/bookmarks/${editingBookmarkId}`, {
      method: 'PUT',
      body: JSON.stringify({ title, url, description, categoryId, tagIds }),
    })
    $('editBmModal').classList.remove('open')
    editingBookmarkId = null
    loadBookmarks(true)
  } catch (e) {
    log.error('Update failed:', e.message)
  } finally {
    $('ebmSave').disabled = false
  }
})

// ===== Moments =====
async function loadMoments(reset) {
  if (state.momentLoading) return
  state.momentLoading = true
  $('mmLoading').style.display = 'block'

  if (reset) {
    state.momentPage = 0
    state.hasMoreMoments = true
    $('momentList').innerHTML = ''
    $('mmLoadMore').style.display = 'none'
  }

  try {
    const params = new URLSearchParams({ page: state.momentPage, size: API_PAGE_SIZE })
    const res = await api(`/moments?${params}`)
    const data = res.data
    const list = $('momentList')

    if (data.content && data.content.length) {
      data.content.forEach(m => list.appendChild(createMomentCard(m)))
    }

    state.hasMoreMoments = data.totalPages > state.momentPage + 1
    $('mmLoadMore').style.display = state.hasMoreMoments ? 'block' : 'none'

    if (!list.children.length) {
      list.innerHTML = '<div class="empty-state">暂无时刻</div>'
    }
  } catch (e) {
    log.error('Failed to load moments:', e.message)
    $('momentList').innerHTML = `<div class="empty-state">加载失败: ${e.message}</div>`
  } finally {
    state.momentLoading = false
    $('mmLoading').style.display = 'none'
  }
}

$('mmLoadMoreBtn').addEventListener('click', () => {
  state.momentPage++
  loadMoments(false)
})

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function terminalLabel(type) {
  switch (type) {
    case 'MOBILE': return `${svg('smartphone', 12)} 移动端`
    case 'API': return `${svg('terminal', 12)} API`
    default: return `${svg('monitor', 12)} 网页`
  }
}

// ===== Confirm Modal =====
function confirmAsync(title, message) {
  return new Promise((resolve) => {
    const modal = $('confirmModal')
    $('modalTitle').textContent = title
    $('modalMessage').textContent = message
    modal.classList.add('open')
    const cleanup = () => {
      modal.classList.remove('open')
      $('modalCancel').removeEventListener('click', onCancel)
      $('modalConfirm').removeEventListener('click', onConfirm)
    }
    const onCancel = () => { cleanup(); resolve(false) }
    const onConfirm = () => { cleanup(); resolve(true) }
    $('modalCancel').addEventListener('click', onCancel)
    $('modalConfirm').addEventListener('click', onConfirm)
  })
}

function createMomentCard(m) {
  const card = document.createElement('div')
  card.className = 'moment-card'
  const id = m.id
  const isLocked = m.isLocked
  const displayText = isLocked ? (m.displayContent || '******') : m.content
  const time = formatTime(m.createdAt)
  const terminal = terminalLabel(m.terminalType)

  let typeIcon = svg('edit', 16)
  if (m.contentType === 'IMAGE') typeIcon = svg('image', 16)
  else if (m.contentType === 'FILE') typeIcon = svg('file', 16)

  let bodyHtml = ''

  if (m.contentType === 'IMAGE' && m.filePath) {
    if (isLocked) {
      bodyHtml += `<div class="mc-img-placeholder">${svg('lock', 14)} 图片已锁定</div>`
    } else {
      bodyHtml += `<img class="mc-img" data-authed-src="${escapeHtml(`/moments/${id}/file`)}" alt="moment image" loading="lazy" />`
    }
  }

  if (m.contentType === 'FILE') {
    bodyHtml += `<div class="mc-file"><span>${svg('paperclip', 14)}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(m.fileName || m.content || '')}</span><span style="color:#999">${formatFileSize(m.fileSize)}</span></div>`
  }

  if (m.contentType !== 'IMAGE') {
    bodyHtml += `<div class="mc-text">${escapeHtml(displayText)}</div>`
  }

  let actionsHtml = ''

  if (isLocked) {
    actionsHtml += `<button class="action-reveal" data-id="${id}" title="查看">${svg('eye', 15)}</button>`
  }

  if (m.contentType === 'IMAGE' && m.filePath) {
    actionsHtml += `<button class="action-copy" data-id="${id}" data-type="image" title="复制图片">${svg('copy', 15)}</button>`
    actionsHtml += `<button class="action-download" data-id="${id}" data-name="${escapeHtml(m.fileName || 'image')}" title="下载">${svg('download', 15)}</button>`
  } else if (m.contentType === 'FILE' && m.filePath) {
    actionsHtml += `<button class="action-download" data-id="${id}" data-name="${escapeHtml(m.fileName || 'file')}" title="下载">${svg('download', 15)}</button>`
  } else {
    actionsHtml += `<button class="action-copy" data-id="${id}" data-type="text" title="复制">${svg('copy', 15)}</button>`
  }

  actionsHtml += `<button class="action-lock" data-id="${id}" data-locked="${isLocked}" title="${isLocked ? '解锁' : '锁定'}">${isLocked ? svg('unlock', 15) : svg('lock', 15)}</button>`
  actionsHtml += `<button class="action-delete" data-id="${id}" title="删除">${svg('trash', 15)}</button>`

  card.innerHTML = `
    <div class="mc-row">
      <div class="mc-icon">${typeIcon}</div>
      <div class="mc-body">
        ${bodyHtml}
        <div class="mc-meta">
          <div class="mc-meta-left">
            <span>${svg('clock', 12)} ${time}</span>
            <span>${terminal}</span>

          </div>
          <div class="mc-actions">${actionsHtml}</div>
        </div>
      </div>
    </div>
  `

  // 鉴权图片：插入后异步加载 blob
  card.querySelectorAll('img[data-authed-src]').forEach(img => {
    setAuthedImg(img, img.dataset.authedSrc)
  })

  const revealBtn = card.querySelector('.action-reveal')
  if (revealBtn) {
    revealBtn.addEventListener('click', async () => {
      const textEl = card.querySelector('.mc-text')
      if (textEl && textEl.textContent === '******') {
        textEl.textContent = m.content
      } else if (textEl) {
        textEl.textContent = displayText
      }
      const imgPlaceholder = card.querySelector('.mc-img-placeholder')
      if (imgPlaceholder) {
        const img = document.createElement('img')
        img.className = 'mc-img'
        img.alt = 'moment image'
        img.loading = 'lazy'
        imgPlaceholder.parentNode.replaceChild(img, imgPlaceholder)
        setAuthedImg(img, `/moments/${id}/file`)
      }
    })
  }

  card.querySelector('.action-lock')?.addEventListener('click', async () => {
    try {
      const newLocked = !isLocked
      await api(`/moments/${id}/lock`, {
        method: 'PUT',
        body: JSON.stringify({ isLocked: newLocked, displayContent: newLocked ? '******' : '' }),
      })
      loadMoments(true)
    } catch (e) {
      log.error('Toggle lock failed:', e.message)
    }
  })

  card.querySelector('.action-copy')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget
    const type = btn.dataset.type
    try {
      if (type === 'image') {
        const blob = await loadAuthedBlob(`/moments/${id}/file`)
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      } else {
        await navigator.clipboard.writeText(m.content)
      }
      btn.innerHTML = svg('check', 15)
      setTimeout(() => { btn.innerHTML = svg('copy', 15) }, 1500)
    } catch (e) {
      log.error('Copy failed:', e.message)
    }
  })

  card.querySelector('.action-download')?.addEventListener('click', async () => {
    const btn = card.querySelector('.action-download')
    try {
      await downloadAuthed(`/moments/${id}/download`, btn.dataset.name)
    } catch (e) {
      log.error('Download failed:', e.message)
    }
  })

  card.querySelector('.action-delete')?.addEventListener('click', async () => {
    if (!(await confirmAsync('确认删除', '确定要删除这条时刻吗？'))) return
    try {
      await api(`/moments/${id}`, { method: 'DELETE' })
      loadMoments(true)
    } catch (e) {
      log.error('Delete failed:', e.message)
    }
  })

  return card
}

// ===== Overview =====
async function loadOverview() {
  const grid = $('overviewGrid')
  grid.innerHTML = '<div class="loading-spinner">加载中...</div>'

  try {
    const [bmRes, mmRes] = await Promise.all([
      api('/bookmarks?page=0&size=1'),
      api('/moments?page=0&size=1'),
    ])
    const bmTotal = bmRes.data.totalElements || 0
    const mmTotal = mmRes.data.totalElements || 0
    const user = currentUser || {}
    const userName = user.name || user.username || user.email || ''

    grid.innerHTML = `
      <div class="overview-card">
        <h3>账号</h3>
        <div class="stat-row"><span>用户</span><span>${escapeHtml(userName)}</span></div>
      </div>
      <div class="overview-card">
        <h3>书签统计</h3>
        <div class="stat-row"><span>总数</span><span>${bmTotal}</span></div>
      </div>
      <div class="overview-card">
        <h3>时刻统计</h3>
        <div class="stat-row"><span>总数</span><span>${mmTotal}</span></div>
      </div>
      <a class="overview-link" id="overviewHomeLink" href="#">
        <span class="link-icon">${svg('external', 16)}</span>
        <span>打开 Scalefish 主页</span>
      </a>
      <button class="btn-danger" id="overviewLogoutBtn" style="width:100%">退出登录</button>
    `
    $('overviewHomeLink').addEventListener('click', (e) => { e.preventDefault(); openHome() })
    $('overviewLogoutBtn').addEventListener('click', logout)
  } catch (e) {
    log.error('Failed to load overview:', e.message)
    grid.innerHTML = `<div class="empty-state">加载失败: ${e.message}</div>`
  }
}

// ===== Categories =====
async function loadCategoriesForFilter() {
  try {
    const [catRes, tagRes] = await Promise.all([
      api('/categories'),
      api('/tags'),
    ])
    const cats = flattenCategories(catRes.data || [])
    const tagList = tagRes.data || []
    state.categories = cats
    state.tags = tagList

    const populateSelect = (selId, items, emptyLabel) => {
      const sel = $(selId)
      sel.innerHTML = `<option value="">${emptyLabel}</option>`
      items.forEach(item => {
        const opt = document.createElement('option')
        opt.value = item.id
        opt.textContent = item.label || `# ${item.name}`
        sel.appendChild(opt)
      })
    }

    populateSelect('filterCategory', cats, '全部分类')
    populateSelect('filterTag', tagList, '全部标签')
    populateSelect('qaCategory', cats, '选择分类')
    populateSelect('qaTag', tagList, '选择标签')
  } catch (e) {
    log.error('Failed to load categories/tags:', e.message)
  }
}

function flattenCategories(cats, parentPath = []) {
  const result = []
  for (const c of cats) {
    const label = parentPath.length > 0 ? `${parentPath.join(' › ')} › ${c.name}` : c.name
    result.push({ id: c.id, label })
    if (c.children?.length) {
      result.push(...flattenCategories(c.children, [...parentPath, c.name]))
    }
  }
  return result
}

// ===== Icons (Feather) =====
const I = {
  bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  smartphone: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  paperclip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
}

function svg(name, size = 20) {
  const inner = I[name]
  if (!inner) return ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
}

// ===== Utilities =====
function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// ===== Init =====
async function initSession() {
  if (!BACKEND_URL) {
    $('loginSubtitle').textContent = '未配置后端地址，请先编辑 config.js'
    $('loginGoBtn').style.display = 'none'
    $('loginRetryBtn').style.display = 'none'
    showView('loggedOutView')
    return
  }
  try {
    await refreshSession()
    log.info('Session restored via refresh cookie')
    await enterMainView()
  } catch (e) {
    log.info('Not logged in: %s — opening home page', e.message)
    showLoggedOut()
    openHome()
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  log.debug('DOMContentLoaded')

  // Render bottom menu icons
  document.querySelectorAll('.bottom-menu button .menu-icon[data-icon]').forEach(el => {
    el.innerHTML = svg(el.dataset.icon, 20)
  })

  // Tab switching
  document.querySelectorAll('.bottom-menu button').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  })

  $('searchBtn').innerHTML = svg('search', 18)
  $('searchBtn').addEventListener('click', () => {
    clearTimeout(searchTimer)
    performSearch()
  })

  await initSession()
})
