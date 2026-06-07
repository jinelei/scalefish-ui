import { useState, useEffect } from 'react'
import { FiPlus, FiTrash2, FiEdit2, FiUsers, FiMail, FiPhone, FiBriefcase } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import { listAddressBooks, createAddressBook, deleteAddressBook, listContacts, createContact, updateContact, deleteContact } from '../api/contacts'
import type { AddressBookResponse, ContactResponse } from '../types'

export default function Contacts() {
  const [books, setBooks] = useState<AddressBookResponse[]>([])
  const [selectedBook, setSelectedBook] = useState<AddressBookResponse | null>(null)
  const [contacts, setContacts] = useState<ContactResponse[]>([])
  const [showBookModal, setShowBookModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactResponse | null>(null)
  const [bookName, setBookName] = useState('')
  const [bookDesc, setBookDesc] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactOrg, setContactOrg] = useState('')
  const [contactNotes, setContactNotes] = useState('')

  useEffect(() => { loadBooks() }, [])

  useEffect(() => {
    if (selectedBook) {
      listContacts(selectedBook.id).then(r => setContacts(r.data.data || [])).catch(() => {})
    } else {
      setContacts([])
    }
  }, [selectedBook])

  function loadBooks() {
    listAddressBooks().then(r => setBooks(r.data.data || [])).catch(() => {})
  }

  function handleCreateBook() {
    if (!bookName.trim()) return toast.error('请输入通讯录名称')
    createAddressBook(bookName, bookDesc || undefined).then(() => {
      toast.success('通讯录已创建')
      setShowBookModal(false)
      setBookName('')
      setBookDesc('')
      loadBooks()
    }).catch(e => toast.error(e.message))
  }

  function handleDeleteBook(id: number) {
    if (!confirm('确定删除此通讯录及其所有联系人？')) return
    deleteAddressBook(id).then(() => {
      toast.success('通讯录已删除')
      if (selectedBook?.id === id) setSelectedBook(null)
      loadBooks()
    }).catch(e => toast.error(e.message))
  }

  function handleCreateContact() {
    if (!selectedBook) return toast.error('请先选择一个通讯录')
    if (!contactName.trim()) return toast.error('请输入联系人姓名')
    const data = { name: contactName, email: contactEmail || undefined, phone: contactPhone || undefined, organization: contactOrg || undefined, notes: contactNotes || undefined }
    if (editingContact) {
      updateContact(editingContact.id, data).then(() => {
        toast.success('联系人已更新')
        setShowContactModal(false)
        resetContactForm()
        loadContacts()
      }).catch(e => toast.error(e.message))
    } else {
      createContact(selectedBook.id, data).then(() => {
        toast.success('联系人已创建')
        setShowContactModal(false)
        resetContactForm()
        loadContacts()
      }).catch(e => toast.error(e.message))
    }
  }

  function handleDeleteContact(id: number) {
    if (!confirm('确定删除此联系人？')) return
    deleteContact(id).then(() => {
      toast.success('联系人已删除')
      loadContacts()
    }).catch(e => toast.error(e.message))
  }

  function loadContacts() {
    if (selectedBook) listContacts(selectedBook.id).then(r => setContacts(r.data.data || [])).catch(() => {})
  }

  function openEditContact(contact: ContactResponse) {
    setEditingContact(contact)
    setContactName(contact.name)
    setContactEmail(contact.email || '')
    setContactPhone(contact.phone || '')
    setContactOrg(contact.organization || '')
    setContactNotes(contact.notes || '')
    setShowContactModal(true)
  }

  function resetContactForm() {
    setEditingContact(null)
    setContactName('')
    setContactEmail('')
    setContactPhone('')
    setContactOrg('')
    setContactNotes('')
  }

  function openCreateContact() {
    resetContactForm()
    setShowContactModal(true)
  }

  return (
    <div className="flex gap-6 h-full">
      <div className="w-72 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300">通讯录</h2>
          <button onClick={() => { setBookName(''); setBookDesc(''); setShowBookModal(true) }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-accent-400 transition-all">
            <FiPlus size={16} />
          </button>
        </div>
        <div className="space-y-1">
          {books.map(book => (
            <div key={book.id}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm ${
                selectedBook?.id === book.id ? 'bg-accent-500/10 text-accent-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
              onClick={() => setSelectedBook(book)}>
              <FiUsers size={16} />
              <span className="flex-1 truncate">{book.name}</span>
              <button onClick={e => { e.stopPropagation(); handleDeleteBook(book.id) }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-all">
                <FiTrash2 size={13} />
              </button>
            </div>
          ))}
          {books.length === 0 && <p className="text-xs text-gray-500 px-3">暂无通讯录</p>}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {selectedBook ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold gradient-text">{selectedBook.name}</h2>
                {selectedBook.description && <p className="text-xs text-gray-500">{selectedBook.description}</p>}
              </div>
              <button onClick={openCreateContact}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent-500/10 text-accent-400 hover:bg-accent-500/20 transition-all">
                <FiPlus size={14} /> 新建联系人
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contacts.map(contact => (
                <div key={contact.id} className="glass rounded-lg p-4 group">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-200">{contact.name}</p>
                      {contact.email && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <FiMail size={12} /> {contact.email}
                        </p>
                      )}
                      {contact.phone && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <FiPhone size={12} /> {contact.phone}
                        </p>
                      )}
                      {contact.organization && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <FiBriefcase size={12} /> {contact.organization}
                        </p>
                      )}
                      {contact.notes && <p className="text-xs text-gray-600 mt-1">{contact.notes}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button onClick={() => openEditContact(contact)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-accent-400 transition-all">
                        <FiEdit2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteContact(contact.id)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-rose-400 transition-all">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {contacts.length === 0 && <p className="text-xs text-gray-500 text-center py-8 col-span-full">暂无联系人</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-500">请从左侧选择一个通讯录</div>
        )}
      </div>

      <Modal open={showBookModal} onClose={() => setShowBookModal(false)} title="新建通讯录">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">名称 *</label>
            <input value={bookName} onChange={e => setBookName(e.target.value)}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">描述</label>
            <input value={bookDesc} onChange={e => setBookDesc(e.target.value)}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
          </div>
          <button onClick={handleCreateBook}
            className="w-full py-2 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-500 transition-colors">
            创建
          </button>
        </div>
      </Modal>

      <Modal open={showContactModal} onClose={() => { setShowContactModal(false); resetContactForm() }}
        title={editingContact ? '编辑联系人' : '新建联系人'}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">姓名 *</label>
            <input value={contactName} onChange={e => setContactName(e.target.value)}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">邮箱</label>
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">电话</label>
            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">组织</label>
            <input value={contactOrg} onChange={e => setContactOrg(e.target.value)}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">备注</label>
            <textarea value={contactNotes} onChange={e => setContactNotes(e.target.value)} rows={3}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors resize-none" />
          </div>
          <button onClick={handleCreateContact}
            className="w-full py-2 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-500 transition-colors">
            {editingContact ? '更新' : '创建'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
