# 内网主页

一个轻量的局域网服务入口页，用来集中展示内网正在运行的网站。

## 启动

```bash
npm start
```

不需要安装第三方依赖，但需要 Node.js 18 或更新版本。

默认访问地址：

```text
http://localhost:3000
```

局域网其他设备可以访问这台机器的局域网 IP，例如：

```text
http://192.168.31.250:3000
```

## 配置站点

编辑 `sites.json`：

```json
[
  {
    "name": "NAS",
    "internalUrl": "http://192.168.31.10:5000",
    "externalUrl": "https://nas.example.com",
    "internalDescription": "局域网内文件服务",
    "externalDescription": "外网访问文件服务",
    "icon": ""
  }
]
```

字段说明：

- `name`：页面上显示的网站名称。
- `internalUrl`：内网访问主页时使用的跳转地址。
- `externalUrl`：外网访问主页时使用的跳转地址。
- `internalDescription`：内网访问主页时显示的描述。
- `externalDescription`：外网访问主页时显示的描述。
- `icon`：可选。留空时会自动尝试读取当前模式下的 `网站地址/favicon.ico`。

旧版的 `url` 和 `description` 字段仍然可用，会同时作为内网和外网内容。新配置建议使用 `internalUrl`、`externalUrl`、`internalDescription` 和 `externalDescription`。

访问模式会根据主页自身的访问地址自动判断：

- 通过 `localhost`、`192.168.x.x`、`10.x.x.x`、`172.16-31.x.x`、`.lan`、`.local` 访问时使用内网地址。
- 通过公网域名或公网 IP 访问时使用外网地址。

如果你有自定义内网域名，可以启动前配置 `INTERNAL_HOSTS`，多个域名用英文逗号分隔：

```powershell
$env:INTERNAL_HOSTS='home.example.com,server.lan'; npm start
```

状态会每 30 秒刷新一次。默认检测超时是 3 秒，可以通过环境变量调整：

```bash
STATUS_TIMEOUT_MS=5000 npm start
```

PowerShell 写法：

```powershell
$env:STATUS_TIMEOUT_MS='5000'; npm start
```
