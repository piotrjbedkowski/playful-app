# Terms & Conditions Risk Analyzer

A lightweight Express app that lets you submit the URL of any Terms & Conditions page. The server fetches the content, sends it to the OpenAI API for legal risk analysis, and returns a user-friendly summary of potential pitfalls.

## Features

- URL input form with a polished UI
- Server-side scraping and text extraction with [cheerio](https://cheerio.js.org/)
- Risk-focused prompt crafted for the OpenAI GPT-4o-mini model
- Markdown rendering in the browser using [marked](https://marked.js.org/)

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key with access to the specified model

### Installation

```bash
npm install
```

### Configuration

Copy the example environment file and add your OpenAI key:

```bash
cp .env.example .env
```

Edit `.env` with the correct values.

### Running the App

```bash
npm run start
```

The app will be available at [http://localhost:3000](http://localhost:3000).

During development you can use hot reloading for the server:

```bash
npm run dev
```

### Usage Notes

- Some Terms & Conditions pages may block automated scraping or require JavaScript rendering; the server will report a descriptive error if it cannot fetch the page.
- The OpenAI response is advisory only—consult a legal professional for binding guidance.

## License

MIT
