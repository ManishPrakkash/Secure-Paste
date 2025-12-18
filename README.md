# 🛡️ Secure Paste

> Never accidentally leak API keys, tokens, or credentials to AI chatbots again.

A browser extension that automatically detects and masks secrets when you paste code into AI platforms like ChatGPT, Claude, and Gemini.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/ManishPrakkash/Secure-Paste.git)

## 🚀 Quick Start

1. **Install** the extension from Chrome Web Store
2. **Paste** your code into any AI platform
3. **Relax** - secrets are automatically masked

No configuration needed. Just install and go.

## ✨ Features

### 🔐 Automatic Secret Detection
- **33 Built-in Patterns**: AWS keys, GitHub tokens, private keys, passwords, database URLs, and more
- **Real-time Masking**: Secrets masked instantly as you paste
- **Smart Detection**: Context-aware pattern matching prevents false positives

### 🔄 Secret Restoration
- **Copy & Restore**: Copy masked text and automatically restore original values
- **AI-Safe Workflow**: Paste masked → AI processes → Copy restored secrets
- **Works Everywhere**: Manual copy (Ctrl+C) and platform copy buttons

### 🎯 Supported Platforms
Pre-configured for popular AI platforms:
- **ChatGPT** (chatgpt.com)
- **Claude** (claude.ai)
- **Google Gemini** (gemini.google.com)
- **Perplexity** (www.perplexity.ai)
- **Grok** (grok.com)

### ⚙️ Customization
- **8 Category Toggles**: Cloud keys, API tokens, private keys, passwords, database, network, PII, custom
- **Custom Patterns**: Add your own patterns for company-specific secrets
- **Per-Site Control**: Enable/disable protection for each site
- **Usage Statistics**: Track how many secrets you've protected

## 🎨 How It Works

### Example

**Before (what you copy)**:
```javascript
const config = {
  awsAccessKey: 'AKIAIOSFODNN7EXAMPLE',
  githubToken: 'ghp_1234567890abcdefghijklmnopqrst',
  database: 'postgres://admin:secret@db.example.com/prod'
};
```

**After (what AI sees)**:
```javascript
const config = {
  awsAccessKey: '[AWS_KEY#a3f7]',
  githubToken: '[GITHUB_TOKEN#b2e9]',
  database: 'postgres://[USER#c4d1]:[PASS#e8f3]@[HOST#f9a2]/prod'
};
```

**Restoration (when you copy back)**:
- Click copy button on AI response → Original secrets automatically restored
- Press Ctrl+C on masked text → Original secrets in clipboard

## 📋 Detection Patterns

### Cloud Provider Keys
- AWS Access Key ID
- Google Cloud API Key
- Azure Connection String

### API & Service Tokens
- GitHub, GitLab, NPM tokens
- JWT, Bearer tokens
- OpenAI, Stripe, SendGrid API keys
- Slack, Discord webhooks/tokens

### Private Keys & Certificates
- RSA, EC, SSH private keys
- PGP private keys
- SSL/TLS certificates

### Passwords & Authentication
- Password field assignments (`password = "..."`)
- Environment variable passwords
- MySQL CLI passwords
- Curl basic auth

### Database Connections
- PostgreSQL, MySQL, MongoDB, Redis URLs
- JDBC connection strings

### Network & Endpoints *(optional)*
- IPv4 addresses
- Full URLs
- HTTP endpoints

### Personal Information *(optional)*
- Email addresses

### Custom Patterns
- Create unlimited patterns for company-specific secrets
- Full regex support
- Per-pattern usage statistics

## 🔒 Privacy & Security

- **100% Local Processing**: All detection happens in your browser
- **No Cloud, No Servers**: Your data never leaves your device
- **No Telemetry**: Zero analytics, zero tracking
- **Minimal Permissions**: Only requires `storage` permission
- **Open Source**: Full source code available for audit

## 📥 Installation

### Chrome Web Store
[Install from Chrome Web Store](https://chromewebstore.google.com/detail/hicjfchdpgbghjilelabhpilcfnlggnk?utm_source=item-share-cb) - Click "Add to Chrome" and start using immediately.

### From Source (Developers)

1. Clone the repository:
   ```bash
   git clone https://github.com/ManishPrakkash/Secure-Paste.git
   cd secure-paste
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## 🛠️ For Developers

### Technologies
- TypeScript (strict mode)
- React 18 with Hooks
- Vite 5
- Tailwind CSS 3
- Chrome Extension Manifest V3

### Build Commands
```bash
npm run dev          # Development build with watch mode
npm run build        # Production build
npm run type-check   # Type checking
```

### Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright (c) 2025 Secure Paste

## 📮 Support

- **Issues**: [GitHub Issues](https://github.com/ManishPrakkash/Secure-Paste.git)

---

**Made with ❤️ for developers who care about security**
