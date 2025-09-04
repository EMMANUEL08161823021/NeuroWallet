import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, CreditCard, Wallet } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'wallet';
  balance: number;
  accountNumber: string;
}

interface AccountCardProps {
  account: Account;
  showBalance: boolean;
  onToggleBalance: () => void;
  onViewDetails: (accountId: string) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  showBalance,
  onToggleBalance,
  onViewDetails
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getAccountIcon = () => {
    switch (account.type) {
      case 'wallet':
        return <Wallet className="h-6 w-6" />;
      case 'savings':
        return <CreditCard className="h-6 w-6" />;
      default:
        return <CreditCard className="h-6 w-6" />;
    }
  };

  const getAccountTypeLabel = () => {
    switch (account.type) {
      case 'checking':
        return 'Checking Account';
      case 'savings':
        return 'Savings Account';
      case 'wallet':
        return 'Digital Wallet';
      default:
        return 'Account';
    }
  };

  return (
    <Card className="w-full max-w-sm bg-gradient-to-br from-primary to-primary-hover text-primary-foreground">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getAccountIcon()}
            <CardTitle className="text-lg font-semibold">
              {account.name}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleBalance}
            className="text-primary-foreground hover:bg-white/20 h-8 w-8 p-0"
            aria-label={showBalance ? "Hide balance" : "Show balance"}
          >
            {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-sm opacity-90">{getAccountTypeLabel()}</p>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div>
            <p className="text-sm opacity-75">Available Balance</p>
            <p className="text-2xl font-bold" aria-live="polite">
              {showBalance ? formatCurrency(account.balance) : '••••••'}
            </p>
          </div>
          
          <div>
            <p className="text-sm opacity-75">Account Number</p>
            <p className="text-sm font-mono">
              ••••{account.accountNumber.slice(-4)}
            </p>
          </div>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onViewDetails(account.id)}
            className="w-full mt-4"
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};