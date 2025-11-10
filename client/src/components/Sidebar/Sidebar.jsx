import React from "react";
import styles from "./Sidebar.module.css";

// одна декларация + один export
export default function Sidebar({ children }) {
  return <aside className={styles.sidebar}>{children}</aside>;
}

