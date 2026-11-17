# 问卦 · iOS 美国区上架步骤

2026-11-17 定：先上美国 App Store。个人开发者账号；Mac 上用 Xcode 打包；登录用「通过 Apple 登录」、Google 和邮箱验证码；会员与充值用 RevenueCat，账号与解锁次数存在 Supabase。

代码已经接好，填上各平台的钥匙就能用。没填钥匙的版本（包括网页预览）照旧全部开放，不出现付费。

标 **【你】** 的步骤要你本人登录各平台操作。每一步拿到的值，按最后的「钥匙对照表」填进去。

---

## 一、Apple 开发者账号【你】

1. 打开 <https://developer.apple.com/programs/enroll/>，用你的 Apple ID 登录（需开启双重认证），选 **Individual / Sole Proprietor（个人）**，付 $99/年。一般 1–2 天开通。
   - 个人账号在商店里显示的卖家是你的真名，以后可以迁到公司名下。
2. 开通后进 [App Store Connect](https://appstoreconnect.apple.com) → **业务（Business）**：签署 **付费 App 协议（Paid Apps Agreement）**，填银行账户和税表。
   - 美国税务居民填 W-9，非美国居民填 W-8BEN。
   - **不签这份协议，内购在沙盒里也拿不到商品**，所以要最先做。

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
4. **邮件模板**：Authentication → Emails → Templates → **Magic Link**，正文里放验证码 `{{ .Token }}`，例如：「你的问卦登录验证码：{{ .Token }}，10 分钟内有效。」**Confirm signup** 模板同样改。
5. **发信服务**：Supabase 自带的发信每小时只能发很少几封，上线前在 Authentication → Emails → SMTP Settings 接一个发信服务（如 Resend、Postmark，免费额度够测试）。
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

## 七、隐私政策网址【你 + 我】

- 隐私政策已写好：[`apps/mobile/public/legal/privacy.html`](../apps/mobile/public/legal/privacy.html)（中英双语，按 App 实际收集的数据写）。
  - 把里面的 `DEVELOPER_NAME` 换成你的名字（个人账号的卖家名），`CONTACT_EMAIL` 换成客服邮箱。告诉我，我来替换。
- 需要一个公开网址。最省事的是 [Cloudflare Pages](https://pages.cloudflare.com)：免费，把 `legal` 文件夹拖上去即可。
  - 得到的网址填到 `VITE_PRIVACY_URL`，App Store Connect 的「隐私政策网址」也填这个。
- 「技术支持网址」也是必填项，可以用同一个站点放一页联系方式。
- 使用条款默认用 Apple 的标准许可协议（EULA），付费页上已有链接，不用另写。

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
| `.env` → `VITE_PRIVACY_URL` | 隐私政策的公开网址 |
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
