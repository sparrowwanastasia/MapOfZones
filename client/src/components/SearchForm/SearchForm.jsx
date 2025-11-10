import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SearchForm.module.css';

const SearchForm = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const onSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    // переходим на карту с параметром q (дальше Map будет реагировать)
    navigate(trimmed ? `/map?q=${encodeURIComponent(trimmed)}` : '/map');
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <input
        className={styles.input}
        type="text"
        placeholder="Найти район…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button className={styles.button} type="submit">Искать</button>
    </form>
  );
};

export default SearchForm;
