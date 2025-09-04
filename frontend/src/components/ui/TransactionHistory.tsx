import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  category?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  maxVisible?: number;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ 
  transactions, 
  maxVisible = 5 
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const visibleTransactions = transactions.slice(0, maxVisible);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {visibleTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No transactions found
            </p>
          ) : (
            visibleTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    transaction.type === 'credit' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {transaction.type === 'credit' ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {transaction.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.date)}
                      </p>
                      {transaction.category && (
                        <Badge variant="outline" className="text-xs">
                          {transaction.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right flex flex-col items-end gap-1">
                  <p className={`font-semibold ${
                    transaction.type === 'credit' 
                      ? 'text-success' 
                      : 'text-destructive'
                  }`}>
                    {transaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <Badge 
                    variant={getStatusColor(transaction.status)} 
                    className="text-xs"
                  >
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};