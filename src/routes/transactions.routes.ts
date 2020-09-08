import { Router } from 'express';
import { getCustomRepository } from 'typeorm';
import path from 'path';

import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';

// import DeleteTransactionService from '../services/DeleteTransactionService';
// import ImportTransactionsService from '../services/ImportTransactionsService';

const transactionsRouter = Router();

transactionsRouter.get('/', async (request, response) => {
  const transactionsRepository = getCustomRepository(TransactionsRepository);

  const balance = await transactionsRepository.getBalance();

  const transactions = await transactionsRepository.find({
    relations: ['category'],
  });

  return response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request, response) => {
  const { title, value, type, category } = request.body;

  if (type !== 'income' && type !== 'outcome') {
    return response.status(400).json({ error: 'type undefined' });
  }

  const createTransaction = new CreateTransactionService();

  const category_title = category;

  const transaction = await createTransaction.execute({
    title,
    value,
    type,
    category_title,
  });

  return response.json(transaction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;

  const deleteTransactionService = new DeleteTransactionService();

  await deleteTransactionService.execute({ id });

  return response.status(204).json();
});

transactionsRouter.post('/import', async (request, response) => {
  const csvPath = path.resolve(
    __dirname,
    '..',
    '__tests__',
    'import_template.csv',
  );

  const importTransactionsService = new ImportTransactionsService();

  const transactions = await importTransactionsService.execute({ csvPath });

  return response.json(transactions);
});

export default transactionsRouter;
