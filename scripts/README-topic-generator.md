# Topic-to-Article Generator

This powerful utility automatically generates high-quality, SEO-optimized articles based on topics defined in your data files. It leverages the Gemini API to create engaging content at scale.

## Features

- Generate articles for specific topics, categories, or trending topics
- Support for bulk generation with configurable concurrency
- State persistence for resumable generation
- Rate limiting to avoid API throttling
- Multiple API keys support with automatic fallback
- Robust error handling and logging
- Optimized image selection via Unsplash

## Requirements

- Node.js 14.x or higher
- NPM or Yarn
- Gemini API key (set in `.env` file as `GEMINI_API_KEY`)
- Unsplash API key (optional, for images, set in `.env` as `UNSPLASH_ACCESS_KEY`)

## Using Multiple API Keys

This generator now supports multiple API keys for both Gemini and Unsplash, providing better reliability through automatic fallback. If one key fails (due to rate limits, expiration, etc.), the system will automatically try another key.

To use multiple keys:

1. Add multiple keys to your `.env` file following this pattern:
```
# Primary keys
GEMINI_API_KEY=your-primary-key
UNSPLASH_ACCESS_KEY=your-primary-unsplash-key

# Fallback keys
GEMINI_API_KEY_1=your-second-gemini-key
GEMINI_API_KEY_2=your-third-gemini-key
UNSPLASH_ACCESS_KEY_1=your-second-unsplash-key
```

2. That's it! The API key manager will automatically detect and use all available keys.

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your API keys
4. Ensure your topics are defined in `data/topics.js`

## Usage

Generate a single article for a specific topic:
```
node scripts/generate-topic-articles.js --topic="AI"
```

Generate articles for an entire category:
```
node scripts/generate-topic-articles.js --category="Technology"
```

Generate articles for trending topics:
```
node scripts/generate-topic-articles.js --trending
```

Generate multiple random articles:
```
node scripts/generate-topic-articles.js --count=5
```

Generate articles for all topics (caution - could be many!):
```
node scripts/generate-topic-articles.js --all
```

Bulk generation with fallback and resumability:
```
node scripts/generate-topic-articles.js --bulk --bulkSize=20
```

## Configuration

You can customize the generator behavior through command-line arguments:

- `--concurrency=<number>`: Maximum parallel article generations
- `--delay=<milliseconds>`: Delay between generations (rate limiting)
- `--timeout=<seconds>`: Timeout for a single article generation
- `--logLevel=<level>`: Set log level (DEBUG, INFO, WARN, ERROR)

## Where Articles Are Saved

Generated articles are saved to:
```
/content/articles/YYYY-MM-DD-slug.md
```

They include rich frontmatter for SEO and site integration.

## Troubleshooting

- **API Key Issues**: Check `.env` file for valid API keys. If using multiple keys, ensure at least one is valid.
- **Rate Limiting**: Increase the `--delay` parameter or add more API keys
- **Generation Failures**: Examine logs for specific error details (in `logs/` directory)
- **Topic Issues**: Ensure topics in `data/topics.js` are properly formatted

## License

MIT License 