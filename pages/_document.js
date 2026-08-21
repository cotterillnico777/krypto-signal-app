import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="de">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#d4af6a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Finlyra" />
        <link rel="icon" href="/icons/favicon-64.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="description" content="Märkte verstehen -- mit Daten, Kontext und transparenten Analysen. Inklusive Krypto-Signalen, Makrodaten und Fear & Greed Index." />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
