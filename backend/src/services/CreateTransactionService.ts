/* eslint-disable @typescript-eslint/no-unused-vars */
import { getRepository } from 'typeorm';
import Category from '../models/Category';
// import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';

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
        const transactionRepository = getRepository(Transaction);
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
