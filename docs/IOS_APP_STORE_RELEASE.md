# 问卦 · iOS 美国区上架步骤

2026-11-17 定：先上美国 App Store。用公司（LLC）注册开发者账号；Mac 上用 Xcode 打包；登录用「通过 Apple 登录」、Google 和邮箱验证码；会员与充值用 RevenueCat，账号与解锁次数存在 Supabase。

代码已经接好，填上各平台的钥匙就能用。没填钥匙的版本（包括网页预览）照旧全部开放，不出现付费。

标 **【你】** 的步骤要你本人登录各平台操作。每一步拿到的值，按最后的「钥匙对照表」填进去。

---

## 一、Apple 开发者账号【你】

公司已注册，D-U-N-S 已于 2026-11-17 申请。商店里的卖家名会是公司名。

1. **等 D-U-N-S 编码**：邓白氏（Dun & Bradstreet）会先发确认邮件，有问题会打电话或发邮件核实公司信息，请留意并及时回复。编码一般 5 个工作日左右下来，最长约 2 周；拿到后还要等 1–2 个工作日，Apple 那边才查得到。
2. **同时准备好**：
   - **EIN（美国税号）**：在 [IRS 网站](https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online)在线申请，当场拿到；填 W-9 税表要用。
   - **公司官网**：Apple 要求填一个属于公司的网站（域名最好和公司名对得上，比如 `wengualabs.com`）。隐私政策和技术支持页可以放在同一个站上（见第七步）。
   - **公司域名邮箱**：比如 `support@wengualabs.com`。Apple 审核公司账号时常用它确认你代表公司，客服邮箱也用它。
   - **公司电话**：Apple 可能会打来核实身份。
3. **注册开发者账号**：拿到 D-U-N-S 后，打开 <https://developer.apple.com/programs/enroll/>，用 Apple ID 登录（需开启双重认证），选 **Organization（公司）**。
   - 填 D-U-N-S 编码和公司法定名称，**与州里注册的完全一致**（包括 "LLC"）；
   - 你的身份写法定代表人（Owner / Member）；
   - 付 $99/年。Apple 核实一般 2–7 天，可能打电话确认。
4. 开通后进 [App Store Connect](https://appstoreconnect.apple.com) → **业务（Business）**：签署 **付费 App 协议（Paid Apps Agreement）**，填公司银行账户和 W-9（用 EIN）。
   - **不签这份协议，内购在沙盒里也拿不到商品**，所以开通后要最先做。

> 等 D-U-N-S 和 Apple 审核的这段时间，可以先做：第七步（发布官网，Apple 注册时要填）、第五步（Supabase）、第六步（Google 登录）。RevenueCat 可以先建项目，App Store 那部分要等 Apple 账号。第二、三步（App ID、建 App、内购商品）要等 Apple 账号开通。

## 二、App ID 与商店里的 App【你】

1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → Identifiers → **+** → App IDs → App。
   - Bundle ID 填 `app.wengua.meihua`（代码里已用这个；**第一次上传后不能再改**，要换现在就说）。
   - Capabilities 勾上 **Sign In with Apple**（In-App Purchase 默认就有）。
2. App Store Connect → 我的 App → **+ 新建 App**。
   - 平台 iOS；名称 **问卦 · 梅花易数**（商店内名称须唯一，若被占可用「问卦 Wengua」）。
   - 主要语言选 **简体中文** 或 **English (U.S.)**，另一种在「本地化」里补上。
   - Bundle ID 选上一步的；SKU 随便填一个，比如 `wengua-ios`。

## 三、内购商品（App Store Connect → 你的 App → 营利）【你】

商品 ID 必须和下面**一字不差**（代码按这些 ID 购买）：

| 类型 | 商品 ID | 价格 | 说明 |
| --- | --- | --- | --- |
| 消耗型 Consumable | `wengua.reading.single` | $0.99 | 单次解锁本卦断语 |
| 消耗型 Consumable | `wengua.reading.pack10` | $4.99 | 十次解锁包（随用随开，不过期） |
| 自动续期订阅 | `wengua.member.monthly` | $9.99 / 1 个月 | 月度会员 |
| 自动续期订阅 | `wengua.member.yearly` | $69.99 / 1 年 | 年度会员 |

- 两个订阅放进同一个**订阅群组**（比如「会员 Membership」），年度排在上面（级别 1）。
- 「新用户免费 3 天」：给两个订阅各加一个**推介促销（Introductory Offer）→ 免费试用 → 3 天**，适用新订阅者。
- 每个商品都要填中英文显示名称和描述，并上传一张**审核截图**（付费页截图即可，可以用网页预览截一张）。
- 用户与访问 → **集成 → App 内购买项目**：生成一把 **In-App Purchase Key（.p8）**，记下 Key ID 和 Issuer ID（给 RevenueCat 用）。
- 用户与访问 → **沙盒 → 测试员**：加一个沙盒测试账号（用一个没注册过 Apple ID 的邮箱），用来在 TestFlight 里试购买，不扣真钱。

## 四、RevenueCat（核对购买）【你】

1. 注册 <https://app.revenuecat.com>，新建 Project「问卦」，添加 **App Store** 应用。
   - Bundle ID 填 `app.wengua.meihua`；上传上一步的 .p8 和 Key ID、Issuer ID。
2. **Products**：导入上面 4 个商品。
3. **Entitlements**：新建一个，标识符必须是 **`member`**，把 `wengua.member.monthly` 和 `wengua.member.yearly` 挂进去。消耗型不挂。
4. **API keys**：
   - App Store 的 **Public key**（`appl_` 开头）→ 填到 `VITE_REVENUECAT_IOS_KEY`。
   - 新建一把 **Secret key**（v1，`sk_` 开头）→ 只放进 Supabase 的密钥（第五步），**不要放进 App 里**。

## 五、Supabase（账号与解锁次数）【你】

1. 注册 <https://supabase.com>，新建 Project，区域选 **East US**。
   - Project Settings → API：记下 **Project URL** 和 **anon public key**。
2. **建表**：SQL Editor 里粘贴并运行 [`apps/mobile/supabase/migrations/20261117000000_credits.sql`](../apps/mobile/supabase/migrations/20261117000000_credits.sql)。
3. **Authentication → Providers**：
   - **Apple**：打开；Client IDs 填 `app.wengua.meihua`。App 里是原生登录，不用填 Secret Key。
   - **Google**：打开；Client ID 填 Google 的 **Web** 客户端 ID 和 **iOS** 客户端 ID（用逗号隔开），Client Secret 填 Web 客户端的密钥（第六步）；打开 **Skip nonce check**。
   - **Email**：打开。
   - Authentication → Sign In / Providers 里打开 **Allow anonymous sign-ins**（游客购买要用）。
4. **邮件模板**（2026-11-17 已设好）：Authentication → Emails → Templates。**Confirm signup**（新用户第一封）贴 [`supabase/templates/confirm-signup.html`](../apps/mobile/supabase/templates/confirm-signup.html)，标题「欢迎来到问卦 · 你的验证码」；**Magic Link**（之后每次登录）贴 [`supabase/templates/magic-link.html`](../apps/mobile/supabase/templates/magic-link.html)，标题「问卦 Wengua 登录验证码」。正文只放验证码 `{{ .Token }}`，不放链接。
5. **发信服务**（2026-11-17 已设好）：SMTP 走 Google Workspace，`smtp.gmail.com:465`，账号 developer@wengualabs.com，密码是这个账号的「应用专用密码」（要先开两步验证）。上线前把 Authentication → Rate Limits 的发信上限调到每小时 100 左右。
6. **部署三个后台函数**（在 Mac 或这台电脑上装 [Supabase CLI](https://supabase.com/docs/guides/cli) 后，在 `apps/mobile` 目录运行）：

   ```bash
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref 你的项目ID
   ```

   ```bash
   npx supabase secrets set REVENUECAT_SECRET_KEY=sk_你的RevenueCat密钥
   ```

   ```bash
   npx supabase functions deploy claim-purchases adopt-guest delete-account
   ```

   - `claim-purchases`：按 RevenueCat 的购买记录给账号记解锁次数（每笔交易只记一次）。
   - `adopt-guest`：游客买过东西后再登录，把次数转到正式账号。
   - `delete-account`：App 内「删除账号」（苹果规定必须有）。

## 六、Google 登录【你】

1. [Google Cloud Console](https://console.cloud.google.com) 新建项目 → **OAuth 同意屏幕**：外部（External），填应用名「问卦」、支持邮箱、隐私政策网址（第七步），发布为正式（In production）。
2. 凭据 → 创建 **OAuth 客户端 ID**，建两个：
   - **iOS**：Bundle ID 填 `app.wengua.meihua` → 得到 iOS Client ID（以及一个「iOS URL scheme」，形如 `com.googleusercontent.apps.xxxx`）。
   - **Web 应用**：已获授权的重定向 URI 填 `https://你的项目.supabase.co/auth/v1/callback` → 得到 Web Client ID 和 Client Secret。
3. Web Client ID / Secret 和 iOS Client ID 填进 Supabase（第五步）。
4. iOS Client ID 填到 `VITE_GOOGLE_IOS_CLIENT_ID`，Web Client ID 填到 `VITE_GOOGLE_WEB_CLIENT_ID`。

## 七、公司官网 wengualabs.com（2026-11-17 已上线）

网站在仓库的 [`site/`](../site/) 文件夹，页面在 `site/public/`，中英双语：

| 网址 | 页面 | 用在哪里 |
| --- | --- | --- |
| `https://wengualabs.com` | 公司首页（Wengua Labs LLC 与问卦介绍） | Apple 公司账号注册时填的官网 |
| `https://wengualabs.com/privacy` | 隐私政策（与 App 里的是同一份） | App Store Connect「隐私政策网址」；App 付费页的链接 |
| `https://wengualabs.com/support` | 技术支持（联系邮箱、恢复购买、取消订阅、退款、删除账号） | App Store Connect「技术支持网址」 |

- 联系邮箱 support@wengualabs.com；使用条款用 Apple 的标准许可协议（EULA），不用另写。
- App 里的隐私政策链接默认指向 `https://wengualabs.com/privacy`，`.env` 里不用再填。
- 隐私政策只改 `apps/mobile/public/legal/privacy.html` 这一份，再复制到 `site/public/privacy.html`。测试会检查两份是否一致。

**怎么托管的**

- 网站是 Cloudflare 上的 Worker `wengualabs`，配置在 [`site/wrangler.jsonc`](../site/wrangler.jsonc)：
  - 发布 `site/public/` 里的页面；
  - 绑定 `wengualabs.com` 和 `www.wengualabs.com`；
  - `/privacy` 打开的是 `privacy.html`；找不到的页面显示 `404.html`。
- DNS 已从 Squarespace 搬到 Cloudflare（名称服务器 `rocky` / `tani.ns.cloudflare.com`）。Google Workspace 邮箱的三条记录（MX、SPF、DKIM）保留在 Cloudflare 的 DNS 里，**改 DNS 时别动它们**，否则 support@wengualabs.com 会收不到信。

**以后怎么更新：推送到 GitHub 就自动发布**

一次性设置【你，约 5 分钟】：

1. Cloudflare → **Workers & Pages** → 点 `wengualabs` → **Settings（设置）** → **Build（构建）** → **Connect（连接）**。
2. 选 **GitHub**，按提示授权 Cloudflare 访问仓库 `turnupmason/Wengua_Meihua`（只授权这一个仓库即可）。
3. 填写：
   - Branch（分支）：`main`
   - **Root directory（根目录）：`site`**
   - Build command（构建命令）：留空
   - Deploy command（部署命令）：`npx wrangler@4.156.2 deploy`
4. 保存。之后每次推送到 `main`，Cloudflare 会自动重新发布，一两分钟后生效。在 **Deployments（部署）** 里能看到每次发布的记录，出错也会在那里显示。

设置好之后，改网站只要告诉我改什么。我改完提交推送，网站就自动更新，不用再拖文件夹。

## 七之二、网页版 app.wengualabs.com

和 App 是同一套代码（`apps/mobile`）。在电脑的宽窗口里用桌面布局，在手机浏览器里和 App 一样。网页版不卖会员，全部免费开放（测试期）；登录用邮箱验证码和 Google，Apple 登录等 Apple 开发者账号开通后再加。

- Cloudflare 上的 Worker `wengua-app`，配置在 [`apps/mobile/wrangler.jsonc`](../apps/mobile/wrangler.jsonc)，发布构建好的 `dist/`，绑定 `app.wengualabs.com`。
- `apps/mobile/public/_headers`：带哈希的文件长期缓存，其余加两条安全头。

一次性设置【你】：

1. Cloudflare → **Workers & Pages** → **Create（创建）** → **Import a repository（导入仓库）** → 选 `turnupmason/Wengua_Meihua`。
2. 填写：
   - Project name：`wengua-app`（必须和 `wrangler.jsonc` 里的 `name` 一样）
   - Build command：`npm run build`
   - Deploy command：`npx wrangler@4.156.2 deploy`
   - Advanced settings → **Root directory：`apps/mobile`**
   - Advanced settings → **Build variables（构建变量）**，加四条（都是公开值，本来就会出现在网页里）：

     | 名称 | 值 |
     | --- | --- |
     | `VITE_SUPABASE_URL` | `https://yjrldtbxorarrfkndzzt.supabase.co` |
     | `VITE_SUPABASE_ANON_KEY` | Supabase 的 publishable key（`sb_publishable_` 开头） |
     | `VITE_GOOGLE_WEB_CLIENT_ID` | Google 的 Web Client ID |
     | `NODE_VERSION` | `22` |

3. **Deploy**。第一次构建约 3～5 分钟（要上传约 900 个文件、280 MB 断语数据）。成功后 `app.wengualabs.com` 会自动加好 DNS。
4. Supabase → Authentication → **URL Configuration**：Site URL `https://app.wengualabs.com`；Redirect URLs 有 `https://app.wengualabs.com/**` 和 `http://localhost:5173/**`。

之后每次推送到 `main`，网页版和官网都会各自重新发布。

## 八、在 Mac 上打包【你，按步骤做】

1. Mac 上安装：
   - App Store 里的最新 **Xcode**；
   - [Node.js 20](https://nodejs.org)；
   - CocoaPods：在终端运行下面这一行。

   ```bash
   sudo gem install cocoapods
   ```

2. 拉代码并装依赖：

   ```bash
   git clone https://github.com/turnupmason/Wengua_Meihua.git
   ```

   ```bash
   cd Wengua_Meihua/apps/mobile && npm ci
   ```

3. 在 `apps/mobile` 下新建 `.env`。照 [`.env.example`](../apps/mobile/.env.example) 填好上面拿到的值；这个文件不要提交到 GitHub。
4. 构建并同步到 iOS 工程：

   ```bash
   npm run build && npx cap sync ios
   ```

   ```bash
   npx cap open ios
   ```

5. Xcode 里选左侧 **App** → **Signing & Capabilities**：
   - Team 选你的开发者账号，Bundle Identifier 确认是 `app.wengua.meihua`；
   - 点 **+ Capability**，加 **Sign in with Apple** 和 **In-App Purchase**。
6. **Info → URL Types → +**：URL Schemes 填 Google 给的 iOS URL scheme（`com.googleusercontent.apps.xxxx`），Google 登录回到 App 要用。
7. 版本：General 里 Version `1.0`、Build `1`。以后每次上传，Build 要加 1。
8. 顶部设备选 **Any iOS Device (arm64)** → 菜单 **Product → Archive** → 弹出窗口里 **Distribute App → App Store Connect → Upload**。

## 九、TestFlight 自测（先自己试，再交审核）【你】

上传后约 10–30 分钟，App Store Connect → TestFlight 出现这个版本。把自己加进内部测试，手机装 TestFlight 打开。

逐项试：

- [ ] 「通过 Apple 登录」「使用 Google 登录」「邮箱登录」（收验证码、填码进入）都能进
- [ ] 游客进入也能用
- [ ] 起卦后的付费页显示 App Store 的真实价格
- [ ] 用沙盒账号买月度会员：付费页显示会员到期日（沙盒里 1 个月 = 5 分钟）
- [ ] 买十次包：「还可解锁 N 卦」出现，用一次后减 1；换一台手机登录同一账号，次数还在
- [ ] 「恢复购买」能找回会员
- [ ] 「我的 → 删除账号」能删，删完回到登录页
- [ ] 没写完的问题显示「古籍考据编写中·即将上线」，不扣次数

## 十、提交审核【你，我帮你写文案】

App Store Connect → 你的 App → iOS App 1.0：

- **截图**：iPhone 6.9 英寸（1320 × 2868）至少 3 张。我可以用预览直接按这个尺寸截：首页、立问、卦笺、藏经阁、付费页。
- **描述、关键词、宣传文本**：中英文我来写。描述末尾附上使用条款（EULA）和隐私政策链接（订阅类 App 的要求）。
- **类别**：主类「生活（Lifestyle）」，副类「参考（Reference）」或「娱乐（Entertainment）」。
- **年龄分级问卷**：没有暴力、赌博、成人内容，一般是 4+。
- **App 隐私（营养标签）**：
  - 「联系信息 → 电子邮件地址、姓名」：与用户关联，用途「App 功能」；
  - 「标识符 → 用户 ID」：与用户关联，用途「App 功能」；
  - 「购买项目 → 购买历史」：与用户关联，用途「App 功能」；
  - 都**不用于追踪**。问事记录只在本机，不算收集。
- **App 审核信息 → 备注**（英文，我来写），说明这几点：
  - 游客可直接进入，不需要账号；
  - 付费页在哪里打开，内购用沙盒测试；
  - 断语来自固定的古籍目录，经人工审核，不是随机生成；
  - 本应用是传统文化学习工具，不作现实预测保证。

  这也是为了应对审核规则 4.3：占卜类 App 常被以“同类太多”拒绝，备注要讲清楚我们的内容是独有的。
- 选择这个 Build、内购商品一起提交（**首次提交时，内购商品要和 App 版本一起送审**）。

审核一般 1–3 天。被拒了把原因发给我，我来改。

---

## 钥匙对照表

| 填在哪里 | 值从哪里来 |
| --- | --- |
| `.env` → `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `.env` → `VITE_REVENUECAT_IOS_KEY` | RevenueCat → API keys → App Store public key（`appl_`） |
| `.env` → `VITE_GOOGLE_IOS_CLIENT_ID`、`VITE_GOOGLE_WEB_CLIENT_ID` | Google Cloud → 凭据 |
| App Store Connect 隐私政策 / 技术支持网址 | `https://wengualabs.com/privacy`、`https://wengualabs.com/support` |
| Supabase 密钥 `REVENUECAT_SECRET_KEY` | RevenueCat → API keys → Secret key（`sk_`），**只放服务器** |
| RevenueCat → App Store 设置 | App Store Connect 的 In-App Purchase Key（.p8、Key ID、Issuer ID） |
| Supabase → Google 提供商 | Google Web 客户端 ID + 密钥，iOS 客户端 ID |
| Supabase → Apple 提供商 | `app.wengua.meihua` |
| Xcode → URL Types | Google 的 iOS URL scheme |

## 代码里对应的地方

- 账号：`apps/mobile/src/services/accounts.ts`（登录、游客匿名账号、删除账号）、`services/appAuth.ts`
- 购买：`apps/mobile/src/services/store.ts`（RevenueCat）、`src/domain/membership.ts`（商品、价格、次数）
- 付费页：`src/ui/MembershipSheet.tsx`；「我的」会员卡与删除账号：`src/ui/MeScreen.tsx`
- 服务器：`apps/mobile/supabase/`（建表 SQL 与三个函数）
- 内测开关：`OPEN_BETA` 在 iOS App 填了 RevenueCat 与 Supabase 钥匙后自动关闭；网页预览一直开放。
- 图标与启动图：`apps/mobile/scripts/build-app-icon.py` 生成。
