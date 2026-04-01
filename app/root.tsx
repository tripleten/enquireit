import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { type LinksFunction } from "@remix-run/node";
import enTranslations from "@shopify/polaris/locales/en.json";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
];

export default function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <PolarisProvider i18n={enTranslations}>
          <Outlet />
        </PolarisProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
