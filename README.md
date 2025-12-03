# Certify - Bulk Certificate Generator

![Certify Banner](https://images.unsplash.com/photo-1562564055-71e051d33c19?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3)

> **A powerful, client-side bulk certificate generation tool built with Next.js.**
> Generate hundreds of custom certificates with QR codes directly in your browser. No server uploads, total privacy.

---

## 🚀 Features

- **⚡ Bulk Generation**: Process hundreds of records from a single CSV file in seconds.
- **🎨 Custom Designs**: Upload any image as your certificate template.
- **🔗 Smart QR Codes**: Automatically generate and embed QR codes for verification links.
- **🖱️ Drag & Drop Editor**: Intuitive UI to position text and QR codes on your template.
- **🔒 Privacy First**: All processing happens locally in your browser. Your data never leaves your device.
- **📦 One-Click Zip**: Download all generated certificates as a neatly organized ZIP archive.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **PDF Engine**: [pdf-lib](https://pdf-lib.js.org/)
- **CSV Parsing**: [Papa Parse](https://www.papaparse.com/)
- **QR Generation**: [qrcode](https://www.npmjs.com/package/qrcode)
- **Compression**: [JSZip](https://stuk.github.io/jszip/)

## 🏁 Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/certify.git
   cd certify/web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open the app**
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

### 1. Upload Data
Prepare a CSV file with your participant details. The file should have headers (e.g., `Name`, `Email`, `VerifyLink`).
> **Tip**: The system automatically detects columns named "Name" or "Link".

### 2. Map Fields
Select which columns from your CSV correspond to the **Recipient Name** and **Verification Link**. You can skip the link if you don't need QR codes.

### 3. Design Certificate
- Upload your certificate template (PNG or JPG).
- Use the controls to adjust the **Position (X, Y)**, **Font Size**, and **Color** of the recipient's name.
- Position and resize the **QR Code**.
- The preview updates in real-time!

### 4. Generate & Download
Click **Generate**. The app will process each row in your CSV, create a PDF, and bundle everything into a ZIP file for download.

## 📂 Project Structure

```
web/
├── app/                  # Next.js App Router
│   ├── page.tsx          # Main application page
│   └── layout.tsx        # Root layout
├── components/           # UI Components
│   ├── UploadStep.tsx    # CSV file upload
│   ├── MappingStep.tsx   # Column mapping logic
│   ├── DesignStep.tsx    # Visual editor for certificate
│   └── GenerateStep.tsx  # PDF generation & Zip logic
├── lib/                  # Utilities (cn, etc.)
└── types/                # TypeScript interfaces
```

## 🤝 Contributing

Contributions are always welcome!
1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
