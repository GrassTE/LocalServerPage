# LocalServerPage

一个轻量的内网/外网服务入口页，用来集中展示站点、图标和在线状态。

## 本地启动

需要 Node.js 18 或更新版本。

```bash
npm start
```

默认访问：

```text
http://localhost:3000
```

## 配置目录

可配置文件都放在 `config/`：

```text
config/
  sites.json
  app.env
  app.env.example
```

`config/sites.json` 配置站点：

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

`config/app.env` 配置运行参数：

```env
PORT=3000
STATUS_TIMEOUT_MS=3000
INTERNAL_HOSTS=
```

站点配置会在每次接口请求时重新读取；修改 `sites.json` 后通常不用重启。修改 `app.env` 后需要重启服务。

## 访问模式

通过 `localhost`、`192.168.x.x`、`10.x.x.x`、`172.16-31.x.x`、`.lan`、`.local` 等地址访问时使用内网 URL 和内网描述。

通过公网域名或公网 IP 访问时使用外网 URL 和外网描述。没有配置外网 URL 的站点会显示为未配置，卡片不可点击。

如果你有自定义内网域名，可以在 `config/app.env` 里配置：

```env
INTERNAL_HOSTS=home.example.com,server.lan
```

## Docker

已经准备好 `Dockerfile` 和 `docker-compose.yml`。

```bash
docker compose up -d --build
```

Docker 部署时，`config` 会挂载到容器内：

```yaml
volumes:
  - ./config:/app/config
```

之后改站点只需要编辑宿主机上的 `config/sites.json`。如果改了 `config/app.env`，重启容器：

```bash
docker compose restart
```
