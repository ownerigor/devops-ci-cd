import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

function setup(t) {
  const app = buildApp();
  t.after(() => app.close());
  return app;
}

test('GET /health identifica uma aplicação saudável', async (t) => {
  const response = await setup(t).inject('/health');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: 'ok', application: 'devops-tasks-api' });
});

test('GET /tasks começa com uma lista vazia', async (t) => {
  const response = await setup(t).inject('/tasks');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), []);
});

test('POST /tasks cria uma tarefa e permite consultar, atualizar e excluir', async (t) => {
  const app = setup(t);
  const created = await app.inject({ method: 'POST', url: '/tasks', payload: { title: 'Estudar DevOps' } });
  assert.equal(created.statusCode, 201);
  assert.equal(created.headers.location, '/tasks/1');
  const task = { id: 1, title: 'Estudar DevOps', completed: false };
  assert.deepEqual(created.json(), task);
  const found = await app.inject('/tasks/1');
  assert.equal(found.statusCode, 200);
  assert.deepEqual(found.json(), task);
  assert.deepEqual((await app.inject('/tasks')).json(), [task]);
  const updated = await app.inject({ method: 'PUT', url: '/tasks/1', payload: { title: 'Apresentar na ETEC', completed: true } });
  assert.equal(updated.statusCode, 200);
  assert.deepEqual(updated.json(), { id: 1, title: 'Apresentar na ETEC', completed: true });
  assert.deepEqual((await app.inject('/tasks/1')).json(), updated.json());
  const deleted = await app.inject({ method: 'DELETE', url: '/tasks/1' });
  assert.equal(deleted.statusCode, 204);
  assert.equal(deleted.body, '');
  assert.equal((await app.inject('/tasks/1')).statusCode, 404);
  assert.deepEqual((await app.inject('/tasks')).json(), []);
  const next = await app.inject({ method: 'POST', url: '/tasks', payload: { title: 'Próxima' } });
  assert.equal(next.json().id, 2);
});

test('validação rejeita títulos e tipos inválidos sem criar tarefas', async (t) => {
  const app = setup(t);
  for (const payload of [{}, { title: '' }, { title: '   ' }, { title: 42 }, { title: 'Teste', completed: 'false' }, { title: 'Teste', extra: true }]) {
    const response = await app.inject({ method: 'POST', url: '/tasks', payload });
    assert.equal(response.statusCode, 400, JSON.stringify(payload));
  }
  assert.deepEqual((await app.inject('/tasks')).json(), []);
});

test('retorna 404 para tarefas ausentes e 400 para IDs inválidos', async (t) => {
  const app = setup(t);
  for (const method of ['GET', 'PUT', 'DELETE']) {
    const payload = method === 'PUT' ? { title: 'Teste', completed: true } : undefined;
    assert.equal((await app.inject({ method, url: '/tasks/999', payload })).statusCode, 404);
    assert.equal((await app.inject({ method, url: '/tasks/abc', payload })).statusCode, 400);
  }
});

test('PUT exige título e completed e preserva tarefa em requisição inválida', async (t) => {
  const app = setup(t);
  await app.inject({ method: 'POST', url: '/tasks', payload: { title: 'Original' } });
  const response = await app.inject({ method: 'PUT', url: '/tasks/1', payload: { title: 'Alterada' } });
  assert.equal(response.statusCode, 400);
  assert.equal((await app.inject('/tasks/1')).json().title, 'Original');
});
