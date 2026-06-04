import React, { useState } from "react";

/*export default function LikeButton() {
  const [users, setUsers] = useState([
    { id: 1, name: "Anna", likes: 0 },
    { id: 2, name: "Ivan", likes: 0 },
    { id: 3, name: "Maria", likes: 0 },
  ]);

  function handleLike(userId) {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === userId
          ? { ...user, likes: user.likes + 1 }
          : user
      )
    );
  }

  return (
    <div>
      <h2>Users</h2>

      {users.map((user) => (
        <div key={user.id} style={{ marginBottom: 12 }}>
          <div>
            Пользователь: <b>{user.name}</b> — лайков: <b>{user.likes}</b>
          </div>

          <button onClick={() => handleLike(user.id)}>
            ❤️ Лайк
          </button>
        </div>
      ))}
    </div>
  );
}
*/
export default function ToDo() {

    const [tasks, setTasks] = useState([
  { id: 1, title: "Изучить map()", completed: false, progress: 0 },
  { id: 2, title: "Понять useState", completed: false, progress: 0 },
  { id: 3, title: "Разобрать prev", completed: false, progress: 0 }
]);

 function handleProgress(taskId) {
  setTasks(prevTasks =>
    prevTasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            progress: Math.min(task.progress + 10, 100),

          }
        : task,
    )
  );
}
function handleComplete(taskId) {
  setTasks(prevTasks =>
    prevTasks.map(task =>
      task.id === taskId
        ? { ...task, completed: true }
        : task
    )
  );
}
function handleResetAll() {
  setTasks(prevTasks =>
    prevTasks.map(task => ({
      ...task,
      progress: 0,
      completed: false,
    }))
  );
}





   return(
      <div>
      <h2>TODO</h2>

      {tasks.map((task) => (
        <div key={task.id} style={{ marginBottom: 12 }}>
          <div>
           Задача: <b>{task.title}</b> — статус:
<b>
  {task.completed ? "Завершена" : "В процессе"}
  — прогресс: {task.progress}%
</b>
          </div>

          <button onClick={() => handleProgress(task.id)}>
            +10 прогресса
          </button>
          <button onClick={() => handleComplete(task.id)}>
            Завершить
          </button>
          <button onClick={handleResetAll} >
            Сбросить все
          </button>
        </div>
      ))}
    </div>

    );

}