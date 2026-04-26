# 配置目录

Docker 部署时建议把整个 `config` 目录挂载到容器内的 `/app/config`。

## sites.json

站点配置文件。修改后页面接口会在下次请求时读取最新内容，通常不需要重启服务。

示例：

```json
{
  "name": "NAS",
  "internalUrl": "http://192.168.31.10:5000",
  "externalUrl": "https://nas.example.com",
  "internalDescription": "局域网内文件服务",
  "externalDescription": "外网访问文件服务",
  "icon": "/config-icons/nas.png",
  "maintenance": false,
  "internalOnly": false
}
```

把 `maintenance` 设置为 `true` 后，该站点会显示“维护中”，并跳过在线检测。

把 `internalOnly` 设置为 `true` 后，如果从外网访问主页，该站点会显示“仅内网访问”，并跳过在线检测。`maintenance` 优先级更高，如果两个字段都是 `true`，会显示“维护中”。

## app.env

运行时环境变量文件。修改后需要重启服务或重启容器。

可用变量：

- `PORT`：服务监听端口，默认 `3000`。
- `STATUS_TIMEOUT_MS`：站点状态检测超时时间，默认 `3000`。
- `INTERNAL_HOSTS`：额外指定为内网访问的域名，多个值用英文逗号分隔。

## app.json

主页显示配置。修改后刷新页面即可生效。

```json
{
  "title": "内网主页",
  "eyebrow": "LAN Home",
  "icon": "/config-icons/favicon.svg"
}
```

- `title`：浏览器标签页标题和页面大标题。
- `eyebrow`：大标题上方的小标题。
- `icon`：浏览器标签页图标路径。

## icons

放自定义图标的目录。目录里的文件可以通过 `/config-icons/文件名` 访问。

例如把 `home.png` 放进 `config/icons/` 后，可以在 `app.json` 中写：

```json
{
  "icon": "/config-icons/home.png"
}
```

站点配置也可以使用这里的图标：

```json
{
  "name": "NAS",
  "icon": "/config-icons/nas.png"
}
```
