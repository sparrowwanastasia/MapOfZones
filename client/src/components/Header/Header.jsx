import { Link } from "react-router-dom";
import styles from "./Header.module.css"; // Import the CSS module for styling
import SearchForm from "../SearchForm/SearchForm";

function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <nav role={"navigation"} className={styles.headerNav}>
          <ul className={styles.headerNavList}>
            <li>
              <Link to={"/"}>Main</Link>
            </li>
            <li>
              <Link to={"/compare"}>Compare</Link>
            </li>
            <li>
              <Link to={"/admin"}>Admin</Link>
            </li>
          </ul>
        </nav>
        <SearchForm />
      </div>
    </header>
  );
}

export default Header;
