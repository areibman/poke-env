import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import bricolage600 from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-600-normal.woff2'
import bricolage700 from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2'
import manrope400 from '@fontsource/manrope/files/manrope-latin-400-normal.woff2'
import manrope500 from '@fontsource/manrope/files/manrope-latin-500-normal.woff2'
import manrope600 from '@fontsource/manrope/files/manrope-latin-600-normal.woff2'
import bricolage600Css from '@fontsource/bricolage-grotesque/600.css?url'
import bricolage700Css from '@fontsource/bricolage-grotesque/700.css?url'
import manrope400Css from '@fontsource/manrope/400.css?url'
import manrope500Css from '@fontsource/manrope/500.css?url'
import manrope600Css from '@fontsource/manrope/600.css?url'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'color-scheme',
        content: 'light dark',
      },
      {
        title: 'Pokebench',
      },
      {
        name: 'description',
        content:
          'Pokebench benchmarks LLM agents in Gen9 Pokémon Showdown Random Battles with replayable reasoning traces, win rates, and leaderboard stats.',
      },
    ],
    links: [
      {
        rel: 'preload',
        href: manrope400,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: manrope500,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: manrope600,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: bricolage600,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: bricolage700,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: manrope400Css,
      },
      {
        rel: 'stylesheet',
        href: manrope500Css,
      },
      {
        rel: 'stylesheet',
        href: manrope600Css,
      },
      {
        rel: 'stylesheet',
        href: bricolage600Css,
      },
      {
        rel: 'stylesheet',
        href: bricolage700Css,
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const stored = localStorage.getItem('pokebench-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#020617';
      root.style.color = '#f8fafc';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#f8fafc';
      root.style.color = '#020617';
    }
    root.style.colorScheme = theme;
  } catch {}
})();`,
          }}
        />
        <HeadContent />
      </head>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-950 antialiased dark:bg-slate-950 dark:text-slate-50">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
