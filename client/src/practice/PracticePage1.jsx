import React,{useState} from "react";

export default function LikeButton(){
    const [likes, setLikes] = useState(0);

const [users, setUsers] = useState([
  { id: 1, name: "Anna", likes: 0 },
  { id: 2, name: "Ivan", likes: 0 },
  { id: 3, name: "Maria", likes: 0 }
];)

    function handleClick(){
      setLikes(prev => prev < 10 ? prev + 1 : prev);
      setUsers(prev =>
   prev.map(user => {
      if (user.id === ???) {
         return { ...user, likes: user.likes + 1 }
      }
      return user
   })
)
    function handleDoubleClick(){
        setLikes(prev=>{
          const next = prev + 5;
            return next >10 ? 10: next;
        });
    function handleCountLike(){

return (
    <div>
        <h2>Пользователь: {users.name}</h2>
      <h2>Лайков: {likes}</h2>

      <button
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
         Поставить лайк
      </button>
    </div>
  );
}