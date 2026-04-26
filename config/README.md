# 配置说明

Docker 部署时建议把整个 `config` 目录挂载到容器内的 `/app/config`。

```text
config/
  app.json
  sites.json
  app.env
  app.env.example
  icons/
```

## app.json

主页显示和分类配置。

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
    }
  ]
}
```

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | string | `内网主页` | 浏览器标题和页面主标题 |
| `eyebrow` | string | `LAN Home` | 主标题上方的小标题 |
| `icon` | string | `/config-icons/favicon.svg` | 浏览器 favicon 和标题左侧图标 |
| `categories` | array | `全部` | 分类按钮列表 |

分类字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 分类 ID，站点用 `category` 引用 |
| `name` | string | 分类名称 |
| `icon` | string | 可选分类图标。为空时显示分类首字；`all` 为空时显示小点 |

## sites.json

站点配置文件。修改后页面接口会在下次请求时读取最新内容，通常不需要重启服务。

```json
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
```

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `name` | string | `站点 N` | 站点名称 |
| `internalUrl` | string | `url` 或空 | 内网模式跳转地址 |
| `externalUrl` | string | `url` 或空 | 外网模式跳转地址 |
| `url` | string | 空 | 旧版兼容字段，同时作为内外网地址 |
| `description` | string | 空 | 旧版兼容字段，同时作为内外网描述 |
| `internalDescription` | string | `description` 或空 | 内网模式描述 |
| `externalDescription` | string | `description` 或空 | 外网模式描述 |
| `icon` | string | 空 | 站点图标路径；为空时显示文字图标 |
| `category` | string | 空 | 分类 ID |
| `maintenance` | boolean | `false` | 显示维护中，并跳过检测 |
| `internalOnly` | boolean | `false` | 外网模式显示仅内网访问，并跳过检测 |
| `showExternal` | boolean | `true` | 外网模式是否显示该站点 |

状态优先级：

1. 外网模式且 `showExternal: false`：不显示
2. `maintenance: true`：维护中
3. 外网模式且 `internalOnly: true`：仅内网访问
4. 当前模式没有 URL：未配置
5. 其他情况：检测在线状态

## app.env

运行时环境变量文件。修改后需要重启服务或容器。

```env
PORT=3000
STATUS_TIMEOUT_MS=3000
INTERNAL_HOSTS=
```

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 服务监听端口 |
| `STATUS_TIMEOUT_MS` | `3000` | 在线检测超时时间，单位毫秒 |
| `INTERNAL_HOSTS` | 空 | 额外指定为内网访问的域名，多个值用英文逗号分隔 |

## icons

自定义图标目录。文件可以通过 `/config-icons/文件名` 访问。

示例：

```json
{
  "icon": "/config-icons/nas.png"
}
```

如果站点 `icon` 为空，会立即显示文字图标，不会请求站点 favicon。想使用站点自己的 favicon 时，可以显式配置：

```json
{
  "icon": "/favicon.ico"
}
```
