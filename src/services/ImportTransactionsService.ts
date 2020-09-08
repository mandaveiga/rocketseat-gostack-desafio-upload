import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  csvPath: string;
}
interface TransactionLine {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category_title: string;
}

class ImportTransactionsService {
  async execute({ csvPath }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const readCSVStream = fs.createReadStream(csvPath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactionsLine: TransactionLine[] = [];

    parseCSV.on('data', async line => {
      const title = line[0];
      const type = line[1];
      const value = line[2];
      const category_title = line[3];

      const transactionLine: TransactionLine = {
        title,
        type,
        value,
        category_title,
      };

      transactionsLine.push(transactionLine);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const transactions: Transaction[] = [];

    for (const transactionLine of transactionsLine) {
      const { title, type, value, category_title } = transactionLine;

      if (type === 'outcome') {
        const { total } = await transactionsRepository.getBalance();
        if (total - value < 0) {
          throw new AppError('Insufficient funds.');
        }
      }

      const categoriesRepository = getRepository(Category);

      let category = await categoriesRepository.findOne({
        where: { title: category_title },
      });

      if (!category) {
        category = categoriesRepository.create({ title: category_title });

        await categoriesRepository.save(category);
      }

      const transaction = await transactionsRepository.create({
        title,
        value,
        type,
        category_id: category.id,
      });

      await transactionsRepository.save(transaction);

      transactions.push(transaction);
    }

    return transactions;
  }
}

export default ImportTransactionsService;
