# LocalServerPage

一个汇总内网服务的主页

## 功能

- 内网和外网 URL 自动切换
- 内网和外网描述自动切换
- 站点分类筛选
- 搜索站点
- 在线、离线、维护中、仅内网访问等状态
- 可配置主页标题、主页图标、分类、站点图标

## 本地启动

需要 Node.js 18 或更新版本。

```bash
npm start
```

默认访问：

```text
http://localhost:3000
```

局域网设备访问：

```text
http://你的局域网IP:3000
```

## 配置目录

所有运行时配置都放在 `config/`：

```text
config/
  app.json          # 主页显示、分类配置
  sites.json        # 站点列表
  app.env           # 运行时环境变量
  app.env.example   # 环境变量模板
  icons/            # 自定义图标目录
```

修改 `sites.json` 和 `app.json` 后，通常刷新页面即可生效。修改 `app.env` 后需要重启服务。

## app.json

`config/app.json` 用于配置主页本身。

```json
{
  "title": "内网主页",
  "eyebrow": "LAN Home",
  "icon": "/config-icons/icon.png",
  "categories": [
    {
      "id": "all",
      "name": "全部",
      "icon": ""
    },
    {
      "id": "movie",
      "name": "影视",
      "icon": "/config-icons/movie.png"
    }
  ]
}
```

字段说明：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | string | `内网主页` | 浏览器标题和页面主标题 |
| `eyebrow` | string | `LAN Home` | 主标题上方的小标题 |
| `icon` | string | `/config-icons/favicon.svg` | 浏览器 favicon 和标题左侧图标 |
| `categories` | array | `[{ "id": "all", "name": "全部" }]` | 分类按钮列表 |

`categories` 字段：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 无 | 分类 ID，站点的 `category` 需要引用它 |
| `name` | string | 无 | 页面上显示的分类名称 |
| `icon` | string | 空 | 分类图标路径；为空时显示分类首字。“全部”分类为空时显示小点 |

建议保留 `id: "all"` 的“全部”分类。

## sites.json

`config/sites.json` 用于配置站点列表。

```json
[
  {
    "name": "NAS",
    "internalUrl": "http://192.168.31.10:5000",
    "externalUrl": "https://nas.example.com",
    "internalDescription": "局域网内文件服务",
    "externalDescription": "外网访问文件服务",
    "icon": "/config-icons/nas.png",
    "category": "movie",
    "maintenance": false,
    "internalOnly": false,
    "showExternal": true
  }
]
```

字段说明：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `name` | string | `站点 N` | 站点名称 |
| `internalUrl` | string | `url` 或空 | 内网模式下点击跳转的地址 |
| `externalUrl` | string | `url` 或空 | 外网模式下点击跳转的地址 |
| `url` | string | 空 | 旧版兼容字段；会同时作为内网和外网地址 |
| `description` | string | 空 | 旧版兼容字段；会同时作为内网和外网描述 |
| `internalDescription` | string | `description` 或空 | 内网模式下显示的描述 |
| `externalDescription` | string | `description` 或空 | 外网模式下显示的描述 |
| `icon` | string | 空 | 站点图标路径；为空时直接显示文字图标 |
| `category` | string | 空 | 分类 ID，对应 `app.json` 的 `categories[].id` |
| `maintenance` | boolean | `false` | 是否维护中；为 `true` 时显示“维护中”并跳过检测 |
| `internalOnly` | boolean | `false` | 是否仅允许内网访问；外网模式显示“仅内网访问”并跳过检测 |
| `showExternal` | boolean | `true` | 是否在外网模式显示；为 `false` 时外网模式隐藏该站点并跳过检测 |

状态优先级：

1. `showExternal: false` 且外网模式：站点不显示
2. `maintenance: true`：显示“维护中”，跳过检测
3. `internalOnly: true` 且外网模式：显示“仅内网访问”，跳过检测
4. 没有当前模式 URL：显示“未配置”
5. 其他情况：检测在线状态

图标说明：

- `icon` 为空时，不会请求站点 favicon，会立即显示文字图标。
- 使用本地图标时，把文件放进 `config/icons/`，然后写 `/config-icons/文件名`。
- 想使用站点自己的 favicon 时，可以显式配置 `"icon": "/favicon.ico"`。

## app.env

`config/app.env` 用于配置运行参数。

```env
PORT=3000
STATUS_TIMEOUT_MS=3000
INTERNAL_HOSTS=
```

字段说明：

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 服务监听端口 |
| `STATUS_TIMEOUT_MS` | `3000` | 在线检测超时时间，单位毫秒 |
| `INTERNAL_HOSTS` | 空 | 额外指定为内网访问的域名，多个值用英文逗号分隔 |

示例：

```env
INTERNAL_HOSTS=home.example.com,server.lan
```

## 访问模式

通过以下地址访问主页时，会使用内网 URL 和内网描述：

- `localhost`
- `127.0.0.1`
- `192.168.x.x`
- `10.x.x.x`
- `172.16.x.x` 到 `172.31.x.x`
- `.lan`
- `.local`
- `INTERNAL_HOSTS` 中配置的域名

通过公网域名或公网 IP 访问时，会使用外网 URL 和外网描述。

如果你把项目放在反向代理后面，服务端会优先读取 `X-Forwarded-Host` 判断访问模式。

## Docker

本地构建并运行：

```bash
docker compose up -d --build
```

Docker 部署时会挂载配置目录：

```yaml
volumes:
  - ./config:/app/config
```

修改 `config/app.env` 后重启容器：

```bash
docker compose restart
```

