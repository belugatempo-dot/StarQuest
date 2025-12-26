# Supabase Email Verification配置指南

## 问题背景
修复了代码层面的type验证问题，现在需要在Supabase Dashboard配置邮件模板和URL设置。

---

## 配置步骤

### 步骤 1: 配置邮件模板 📧

1. 打开你的 **Supabase Dashboard**
2. 进入 **Authentication** → **Email Templates**
3. 选择 **"Confirm signup"** 模板
4. **替换整个模板内容**为以下代码：

```html
<h2>{{ .SiteURL }}</h2>
<h1>Confirm your signup / 确认注册</h1>

<p>Welcome to StarQuest! / 欢迎来到夺星大闯关！</p>

<p>Follow this link to confirm your account:</p>
<p>点击以下链接验证您的账户：</p>

<p><a href="{{ .SiteURL }}/en/auth/callback?token_hash={{ .TokenHash }}&type=email">Confirm your email / 验证邮箱</a></p>

<p style="margin-top: 20px; padding: 12px; background-color: #f5f5f5; border-radius: 4px; font-size: 12px; color: #666;">
<strong>Or copy and paste this URL into your browser:</strong><br/>
{{ .SiteURL }}/en/auth/callback?token_hash={{ .TokenHash }}&type=email
</p>

<p style="margin-top: 20px; font-size: 11px; color: #999;">
If you didn't sign up for this account, you can safely ignore this email.<br/>
如果您没有注册此账户，可以忽略此邮件。
</p>
```

**关键点：**
- ✅ 使用 `{{ .TokenHash }}` 而不是 `{{ .ConfirmationURL }}`
- ✅ 明确指定 `type=email`
- ✅ 指向我们自己的callback route (`/en/auth/callback`)
- ✅ 包含纯文本URL备份（防止邮件客户端不渲染HTML链接）
- ✅ 双语支持（中英文）

5. 点击 **Save** 保存

---

### 步骤 2: 配置Site URL 🔗

1. 在Supabase Dashboard，进入 **Authentication** → **URL Configuration**

2. 找到 **Site URL** 设置

3. 检查你的dev server端口：
   - 看你的终端输出 `npm run dev`
   - 通常是 `http://localhost:3000`
   - 如果3000被占用，可能是 `http://localhost:3003`

4. 将Site URL设置为：
   ```
   http://localhost:3000
   ```

   **或者如果你的dev server在3003端口：**
   ```
   http://localhost:3003
   ```

5. 点击 **Save**

---

### 步骤 3: 配置Redirect URLs白名单 🔐

1. 在同一个 **URL Configuration** 页面

2. 找到 **Redirect URLs** 部分

3. 点击 **"Add URL"** 添加以下4个URL：

   **如果使用端口3000：**
   ```
   http://localhost:3000/en/auth/callback
   http://localhost:3000/zh-CN/auth/callback
   http://localhost:3000/en/auth/confirmed
   http://localhost:3000/zh-CN/auth/confirmed
   ```

   **如果使用端口3003：**
   ```
   http://localhost:3003/en/auth/callback
   http://localhost:3003/zh-CN/auth/callback
   http://localhost:3003/en/auth/confirmed
   http://localhost:3003/zh-CN/auth/confirmed
   ```

4. 点击 **Save**

---

## 验证配置是否正确 ✅

配置完成后，检查：

- [ ] Email Templates → Confirm signup 模板包含 `{{ .TokenHash }}` 和 `type=email`
- [ ] URL Configuration → Site URL 设置为你的本地dev server URL
- [ ] URL Configuration → Redirect URLs 包含4个callback和confirmed URL

---

## 下一步：测试邮件验证流程 🧪

配置完成后，你需要**获取新的验证邮件**才能测试（旧邮件可能仍使用旧格式）。

### 测试步骤：

1. **方式1：注册新用户**
   - 访问 `http://localhost:3000/zh-CN/register`（或你的端口）
   - 使用新邮箱注册
   - 查收验证邮件

2. **方式2：重新发送验证邮件**
   - 访问 `http://localhost:3000/zh-CN/auth/verify-email`
   - 点击"重新发送验证邮件"按钮
   - 查收新邮件

### 检查邮件内容：

打开邮件，查看链接格式应该是：
```
http://localhost:3000/en/auth/callback?token_hash=xxxxx&type=email
```

**关键检查点：**
- ✅ URL包含 `token_hash` 参数
- ✅ URL包含 `type=email` 参数（不是type=signup）
- ✅ URL指向 `/en/auth/callback`

### 点击链接测试：

1. 点击邮件中的验证链接
2. 应该看到成功页面（绿色✅图标，"邮箱已验证！"）
3. 点击"前往登录"
4. 使用邮箱和密码登录
5. 成功进入dashboard

---

## 如果仍然出现错误 🐛

### 检查控制台日志

打开浏览器开发者工具Console，查找错误日志：

```
❌ Verification error: {
  message: "...",
  status: ...,
  token_hash_length: ...,
  type_received: "...",
  type_used: "..."
}
```

**可能的问题：**

1. **type_received 仍然是 "signup"**
   → 邮件模板配置未生效，检查是否保存
   → 获取新邮件（旧邮件仍用旧格式）

2. **token_hash_length 为 0 或 undefined**
   → URL参数错误，检查邮件模板是否正确使用 `{{ .TokenHash }}`

3. **"redirect URL not allowed"错误**
   → Redirect URLs白名单未配置，检查步骤3

---

## 临时解决方案（可选）⚠️

如果你想暂时跳过邮件验证来测试其他功能：

1. Supabase Dashboard → **Authentication** → **Providers** → **Email**
2. **关闭** "Confirm email" 选项
3. 用户注册后立即可以登录

**⚠️ 重要：** 完成测试后记得重新开启！生产环境必须验证邮箱！

---

## 生产环境配置 🚀

部署到生产环境时，需要更新：

### Site URL
```
https://yourdomain.com
```

### Redirect URLs
```
https://yourdomain.com/en/auth/callback
https://yourdomain.com/zh-CN/auth/callback
https://yourdomain.com/en/auth/confirmed
https://yourdomain.com/zh-CN/auth/confirmed
```

### 邮件模板
将 `{{ .SiteURL }}` 保持不变，Supabase会自动替换为正确的域名。

---

## 总结

**修复内容：**
1. ✅ 代码层面：callback route添加EmailOtpType验证
2. 📧 配置层面：自定义邮件模板使用 `type=email`
3. 🔗 安全层面：配置Site URL和Redirect URLs白名单

**修复后的效果：**
- 用户注册 → 收到验证邮件
- 点击链接 → 成功验证 → 可以登录
- 错误信息中文化
- 可以重新发送验证邮件

---

## 问题排查清单

- [ ] Supabase邮件模板已更新（包含 `{{ .TokenHash }}` 和 `type=email`）
- [ ] Site URL配置正确（匹配dev server端口）
- [ ] Redirect URLs已添加（4个URL）
- [ ] 获取了新的验证邮件（不是旧邮件）
- [ ] 邮件链接格式正确（包含token_hash和type=email）
- [ ] 点击链接后成功跳转到confirmed页面
- [ ] 可以登录并进入dashboard

如果所有步骤都完成但仍有问题，请查看浏览器Console的错误日志，并提供详细信息。
