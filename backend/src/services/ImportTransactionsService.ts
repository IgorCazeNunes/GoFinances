import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { getCustomRepository, getRepository, In } from 'typeorm';
import uploadConfig from '../config/upload';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
    csvFilePath: string;
}

interface CSVTransaction {
    title: string;
    value: number;
    type: 'income' | 'outcome';
    category: string;
}

class ImportTransactionsService {
    async execute({ csvFilePath }: Request): Promise<Transaction[]> {
        const transactionRepository = getCustomRepository(
            TransactionsRepository,
        );

        const categoriesRepository = getRepository(Category);

        const readCSVStream = fs.createReadStream(csvFilePath);

        const parseStream = csvParse({
            from_line: 2,
        });

        const parseCSV = readCSVStream.pipe(parseStream);

        const transactions: CSVTransaction[] = [];
        const categories: string[] = [];

        parseCSV.on('data', async line => {
            const [title, type, value, category] = line.map((cell: string) => {
                return cell.trim();
            });

            if (!title || !type || !value) return;

            categories.push(category);

            transactions.push({ title, type, value, category });
        });

        await new Promise(resolve => {
            parseCSV.on('end', resolve);
        });

        await fs.promises.unlink(csvFilePath);

        const existentCategories = await categoriesRepository.find({
            where: {
                title: In(categories),
            },
        });

        const existentCategoriesTitles = existentCategories.map(
            (category: Category) => category.title,
        );

        const addCategoryTitles = categories
            .filter(category => !existentCategoriesTitles.includes(category))
            .filter((value, index, self) => self.indexOf(value) === index);

        const newCategories = categoriesRepository.create(
            addCategoryTitles.map(title => ({
                title,
            })),
        );

        await categoriesRepository.save(newCategories);

        const finalCategories = [...newCategories, ...existentCategories];

        const createdTransactions = transactionRepository.create(
            transactions.map(transaction => ({
                title: transaction.title,
                type: transaction.type,
                value: transaction.value,
                category: finalCategories.find(
                    category => category.title === transaction.category,
                ),
            })),
        );

        await transactionRepository.save(createdTransactions);

        return createdTransactions;
    }
}

export default ImportTransactionsService;
