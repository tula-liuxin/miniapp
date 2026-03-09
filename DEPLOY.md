# 手机预览/部署说明

## 1. 你需要提供给我的最少配置

- 微信小程序 `AppID`
- 一个手机可访问的后端 API 地址
  - 推荐：公网 `HTTPS` 地址，例如 `https://your-api.example.com/api`
  - 临时调试可选：同一局域网下的本机地址，例如 `http://192.168.1.20:3100/api`
- 你的微信开发者工具已经登录可用

## 2. 我会替你执行的配置命令

```bash
npm run configure:miniapp -- --appid <你的AppID> --api-base <你的API地址> --app-name 宫颈癌患者关护 --project-name cervical-care
```

这个命令会自动更新：

- `project.config.json` 里的 `appid`
- `miniprogram/config.js` 里的接口地址

## 3. 后端准备

如果只是本机调试：

```bash
npm run start:server
```

默认服务地址：

- `http://127.0.0.1:3100`
- 健康检查：`http://127.0.0.1:3100/health`

## 4. 真机相关说明

- `127.0.0.1` 只对当前电脑有效，手机不能访问
- 真机预览要么使用公网 `HTTPS` API，要么使用同局域网 IP 做临时联调
- 如果走正式微信小程序预览/上传，后端域名通常还需要加入微信小程序后台的 `request 合法域名`

## 5. 已有验证

- Playwright smoke 已可运行：`npm run smoke:playwright`
- mock server 真实接口链路已验证
- 原生小程序 automator 脚手架已接好，但当前这台机器上的微信开发者工具自动化端口仍需进一步环境排障
