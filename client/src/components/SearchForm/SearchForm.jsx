import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./SearchForm.module.css";

const SearchForm = () => {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const navigate = useNavigate();

  const onSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    // переходим на карту с параметром q (дальше Map будет реагировать)
    navigate(trimmed ? `/map?q=${encodeURIComponent(trimmed)}` : "/map");
  };

  const onReset = () => {
    setQuery("");
    navigate("/map");
  };

  const showResetButton = useMemo(() => query.trim().length > 0, [query]);

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.inputWrapper}>
        <input
          className={styles.input}
          type="text"
          placeholder="Найти район…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {showResetButton && (
          <button
            type="button"
            className={styles.clearButton}
            aria-label="Очистить поиск"
            onClick={onReset}
          >
            ×
          </button>
        )}
      </div>
      <button className={styles.button} type="submit">
        Искать
      </button>
    </form>
  );
};

export default SearchForm;
