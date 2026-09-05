const params = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', pattern: '^[1-9][0-9]*$' } },
};

const body = {
  type: 'object',
  required: ['title'],
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200, pattern: '\\S' },
    completed: { type: 'boolean' },
  },
};

export default async function tasksRoutes(app) {
  // Cada instância tem seus dados; reiniciar o processo apaga as tarefas.
  const tasks = new Map();
  let nextId = 1;
  const notFound = (reply) => reply.code(404).send({ message: 'Tarefa não encontrada' });

  app.get('/tasks', async () => [...tasks.values()]);

  app.get('/tasks/:id', { schema: { params } }, async (request, reply) => {
    return tasks.get(Number(request.params.id)) ?? notFound(reply);
  });

  app.post('/tasks', { schema: { body } }, async (request, reply) => {
    const task = {
      id: nextId++,
      title: request.body.title.trim(),
      completed: request.body.completed ?? false,
    };
    tasks.set(task.id, task);
    return reply.code(201).header('Location', `/tasks/${task.id}`).send(task);
  });

  app.put('/tasks/:id', {
    schema: { params, body: { ...body, required: ['title', 'completed'] } },
  }, async (request, reply) => {
    const id = Number(request.params.id);
    if (!tasks.has(id)) return notFound(reply);
    const task = { id, title: request.body.title.trim(), completed: request.body.completed };
    tasks.set(id, task);
    return task;
  });

  app.delete('/tasks/:id', { schema: { params } }, async (request, reply) => {
    if (!tasks.delete(Number(request.params.id))) return notFound(reply);
    return reply.code(204).send();
  });
}
