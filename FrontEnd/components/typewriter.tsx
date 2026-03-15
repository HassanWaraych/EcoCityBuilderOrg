"use client";

import { useEffect, useState } from "react";
import styles from "./Typewriter.module.css";

type TypewriterProps = {
  text: string;
  speed?: number;
};

export default function Typewriter({
  text,
  speed = 40,
}: TypewriterProps) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let index = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));

      if (index >= text.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <p className={styles.text}>
      {displayed}
      <span className={styles.cursor}>|</span>
    </p>
  );
}
