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

## GitHub Actions 打包镜像

仓库里已经包含 `.github/workflows/docker.yml`。推送到 `master` 或 `main` 后会自动构建并推送镜像：

```text
ghcr.io/grasste/localserverpage:latest
```

也会生成分支标签、Git 标签和 commit sha 标签。发布版本时可以打 tag：

```bash
git tag v1.0.0
git push origin v1.0.0
```

服务器上如果想直接使用 GitHub Actions 构建好的镜像，可以用：

```bash
docker compose -f docker-compose.prod.yml up -d
```
