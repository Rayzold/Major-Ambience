import { useEffect } from "react";
import { installGlobalStyles } from "@mc/ui";
import { Library } from "./Library.js";

export default function App() {
  useEffect(() => {
    installGlobalStyles();
  }, []);
  return <Library />;
}
