# Scalefish Chrome Extension

离线安装的 Chrome 书签/时刻插件。

## 配置

编辑 `config.js`，填入你的 Scalefish 地址：

```js
const SCALEFISH_CONFIG = {
  BACKEND_URL: 'https://your-scalefish.com/api', // 后端 API 地址
  HOME_URL: 'https://your-scalefish.com',        // 网站主页
}
```

## 安装方式

1. 打开 Chrome/Edge，进入扩展管理页面 (`chrome://extensions`)
2. 开启右上角的 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `scalefish-chrome-ext` 目录

## 使用方式

1. 点击扩展图标：若未登录，会自动打开 Scalefish 网站
2. 在网站中完成登录（登录态通过 HttpOnly Cookie 保持，与网站共用）
3. 回到浏览器点击扩展图标即可使用：书签浏览/搜索/新增、时刻记录、概览

插件本身不再提供登录页或配置页，也不保存任何 token：

- access token 仅保存在插件内存中，每次打开弹窗通过网站的 refresh cookie 自动换取
- refresh token 为 HttpOnly Cookie，由网站登录时写入，浏览器自动携带
