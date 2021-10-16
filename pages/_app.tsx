import "../styles/globals.css";
import "react-big-calendar/lib/sass/styles.scss";

import type { AppProps } from "next/app";

import { ChakraProvider } from "@chakra-ui/react";
import { createRenderer } from 'fela'
import { RendererProvider } from "react-fela";
const renderer = createRenderer();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <RendererProvider renderer={renderer}>
        <Component {...pageProps} />
      </RendererProvider>
    </ChakraProvider>
  );
}

export default MyApp;
