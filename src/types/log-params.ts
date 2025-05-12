export type LogParams = {
	message: string;
	transaction_id?: string;
	meta?: Record<string, any>;
	error?: any;
};