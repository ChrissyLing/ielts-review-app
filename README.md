# IELTS 错题本

雅思错题与生词管理（Next.js + LocalStorage）。支持截图 AI 识别、闪卡间隔复习、JSON 备份。

## 本地开发

```bash
cd ielts-review-app
npm install
cp .env.example .env.local
# 编辑 .env.local，填入 ARK_API_KEY（截图识别需要）
npm run dev
```

打开 http://localhost:3000

## 部署到 Vercel（发链接给朋友）

每人打开链接后，数据存在**各自浏览器**里，互不影响。截图识别走你在 Vercel 配置的火山 API Key。

### 第一步：准备 Git 仓库

在项目目录 `ielts-review-app` 下：

```bash
git init
git add .
git commit -m "Initial commit: IELTS review app MVP"
```

在 GitHub 新建一个**空仓库**（不要勾选 README），然后：

```bash
git remote add origin https://github.com/你的用户名/你的仓库名.git
git branch -M main
git push -u origin main
```

**注意：** `.env.local` 已在 `.gitignore` 里，不会被提交。切勿把 API Key 写进代码或提交到 Git。

### 第二步：导入 Vercel

1. 打开 https://vercel.com ，用 GitHub 登录  
2. **Add New → Project**，选择刚推送的仓库  
3. **Root Directory**：若仓库根目录就是 `ielts-review-app`，留空；若仓库是上一级文件夹，填 `ielts-review-app`  
4. **Framework Preset** 应自动识别为 Next.js，无需改构建命令（`npm run build`）  
5. 展开 **Environment Variables**，添加：

| 名称 | 值 | 环境 |
|------|-----|------|
| `ARK_API_KEY` | 火山方舟 API Key | Production（建议 Preview 也勾上） |
| `ARK_MODEL` | `doubao-seed-1.6-250615` | 可选 |
| `ARK_BASE_URL` | `https://ark.cn-beijing.volces.com/api/v3` | 可选 |

6. 点击 **Deploy**，等待 1–3 分钟  

部署成功后得到类似：`https://ielts-review-xxxx.vercel.app`

### 第三步：分享给朋友

把上面的链接发给对方即可。对方用手机或电脑浏览器打开，无需安装。

**使用说明（可一并转发）：**

- 侧边栏 **录入**：听力/阅读上传错题截图；写作/口语只记生词  
- **闪卡复习**：按间隔重复复习  
- **数据管理**：定期导出 JSON 备份（换浏览器前务必导出）  

### 部署后自检

在正式链接上测试：

1. 打开 `/mistakes/new`，上传一张错题截图，约 20 秒后表格是否自动填入  
2. 保存后 `/dashboard` 是否有统计  
3. `/settings` 能否导出 JSON  

若截图识别报错「ARK_API_KEY 未配置」，说明 Vercel 环境变量未保存或未重新 Deploy。

### 部署失败：`maxDuration` / Hobby 计划

免费 **Hobby** 计划 Serverless 函数最长 **10 秒**。若 `route.ts` 里写了 `maxDuration = 60`，部署可能直接失败。本项目已改为 `10`。

截图识别通常需 **15–25 秒**。在 Hobby 上可能超时；需要 **Vercel Pro** 时，在 `vercel.json` 增加：

```json
{
  "functions": {
    "app/api/parse-mistake-image/route.ts": { "maxDuration": 60 }
  }
}
```

并同步把 `app/api/parse-mistake-image/route.ts` 里的 `maxDuration` 改为 `60`，然后 Redeploy。

## 费用与安全

- **API 费用**：所有访客的截图识别都消耗**你账号**下的火山方舟额度，用的人越多费用越高  
- **Key 安全**：只放在 Vercel 环境变量，不要写进前端代码或公开仓库  
- 若 Key 曾泄露，请到 [火山控制台](https://console.volcengine.com/ark) 重置并更新 Vercel 环境变量后 **Redeploy**

## 功能一览

| 路径 | 功能 |
|------|------|
| `/dashboard` | 错题统计 |
| `/mistakes/new` | 智能录入 |
| `/mistakes` | 错题列表 |
| `/mistakes/[id]` | 编辑单条 |
| `/review` | 生词与知识点汇总 |
| `/review/study` | 闪卡复习 |
| `/settings` | JSON 导入/导出 |

## 技术栈

- Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui  
- 数据：浏览器 LocalStorage（无后端）  
- 截图识别：火山方舟 Vision API（服务端 Route Handler）
