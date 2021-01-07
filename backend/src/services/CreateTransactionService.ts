import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';
import Category from '../models/Category';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
    title: string;
    value: number;
    type: 'income' | 'outcome';
    category: string;
}
class CreateTransactionService {
    public async execute({
        title,
        value,
        type,
        category: categoryTitle,
    }: Request): Promise<Transaction> {
        const transactionRepository = getCustomRepository(
            TransactionsRepository,
        );

        const { total } = await transactionRepository.getBalance();

        if (type === 'outcome' && total < value) {
            throw new AppError(`You don't have this value on your account.`);
        }

        const categoryRepository = getRepository(Category);

        let category = await categoryRepository.findOne({
            where: { title: categoryTitle },
        });

        if (!category) {
            category = categoryRepository.create({ title: categoryTitle });
            await categoryRepository.save(category);
        }

        const transaction = transactionRepository.create({
            title,
            value,
            type,
            category,
        });

        await transactionRepository.save(transaction);

        return transaction;
    }
}

export default CreateTransactionService;
