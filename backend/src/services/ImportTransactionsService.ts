import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';
import CreateTransactionService from './CreateTransactionService';

interface Request {
    fileName: string;
}

interface CSVTransaction {
    title: string;
    value: number;
    type: 'income' | 'outcome';
    category: string;
}

class ImportTransactionsService {
    async execute({ fileName }: Request): Promise<Transaction[]> {
        const csvFilePath = path.join(uploadConfig.directory, fileName);

        const readCSVStream = fs.createReadStream(csvFilePath);

        const parseStream = csvParse({
            from_line: 2,
            ltrim: true,
            rtrim: true,
        });

        const parseCSV = readCSVStream.pipe(parseStream);

        const transactionsCSV: CSVTransaction[] = [];

        parseCSV.on('data', async line => {
            const [title, type, value, category] = line.map((cell: string) => {
                return cell.trim();
            });

            if (!title || !type || !value) return;

            transactionsCSV.push({ title, type, value, category });
        });

        await new Promise(resolve => {
            parseCSV.on('end', resolve);
        });

        await fs.promises.unlink(csvFilePath);

        const createTransactionService = new CreateTransactionService();

        const transactions = transactionsCSV.map(
            async ({ title, value, type, category }) => {
                const transaction = await createTransactionService.execute({
                    title,
                    type,
                    value,
                    category,
                });

                return transaction;
            },
        );

        return Promise.all(transactions);
    }
}

export default ImportTransactionsService;
