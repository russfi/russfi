import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import { Send, BotIcon, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminPanelLayout } from "@/components/admin-panel/admin-panel-layout";


const ThinkingIndicator = () => (
  <div className="flex items-start gap-3">
    <div className="w-8 flex justify-center">
      <Avatar className="w-8 h-8 bg-primary-dark">
        <BotIcon className="w-5 h-5 text-white" />
      </Avatar>
    </div>
    <div className="bg-secondary text-white rounded-xl p-3">
      <div className="flex gap-2 items-center">
        <span className="text-sm">Thinking...</span>
        <div className="flex gap-1">
          <span className="animate-pulse">●</span>
          <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>●</span>
          <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>●</span>
        </div>
      </div>
    </div>
  </div>
);

// Format error messages
const formatError = (message) => (
  <div className="space-y-3">
    <div className="flex gap-2 items-center mb-1">
      <AlertCircle className="w-5 h-5 text-error" />
      <span className="text-sm font-medium text-error">Error</span>
    </div>
    <p className="text-base whitespace-pre-line">{message}</p>
  </div>
);

// Format token details
const formatTokenDetails = (token, balance) => (
  <div className="space-y-3">
    <div className="flex flex-col">
      <p className="text-base font-medium">Amount of {token.token_name} to sell?</p>
      <div className="mt-2 p-3 bg-primary-bg rounded-md border border-dark">
        <p className="text-sm text-muted">Available: {parseFloat(balance).toLocaleString()}</p>
      </div>
    </div>
  </div>
);

// Format sell quote details
const formatSellDetails = (quote) => {  
  const tokensLeft = quote.balance ? (parseFloat(quote.balance) - parseFloat(quote.amount)).toFixed(2) : "N/A";
  
  return (
    <div className="space-y-3">
      <div className="p-3 bg-primary-bg rounded-md border border-dark space-y-2">
        <h3 className="font-medium text-base">Transaction Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted">Selling:</span>
            <span className="font-medium">{quote.amount} {quote.token_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted">Receiving:</span>
            <span className="font-medium">{quote.estimated_output} S</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted">Remaining:</span>
            <span className="font-medium">{tokensLeft} {quote.token_name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Format success message
const formatSuccess = (transaction) => (
  <div className="space-y-3">
    <div className="flex gap-2 items-center mb-1">
      <CheckCircle2 className="w-5 h-5 text-success" />
      <span className="text-base font-medium text-success">Transaction successful!</span>
    </div>
    
    <div className="mt-2">
      <p className="text-xs text-muted">Received</p>
      <p className="text-base font-medium text-success">
        {transaction.sonic_received} SONIC
      </p>
    </div>
    
    {transaction.explorer_url && (
      <div className="mt-2">
        <a 
          href="#" // Changed to # to hide actual link
          className="text-link hover:underline text-sm flex items-center"
        >
          View Transaction
          <ArrowRight className="ml-1 h-3 w-3" />
        </a>
      </div>
    )}
  </div>
);

// Token listing table 
const TokenGrid = ({ tokens, selectedTokenId, onSelect, isLatest }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[400px]">
        <thead>
          <tr className="border-b border-dark">
            <th className="py-2 text-left text-sm font-normal text-muted">Asset</th>
            <th className="py-2 text-left text-sm font-normal text-muted">Amount</th>
            <th className="py-2 text-left text-sm font-normal text-muted">Value</th>
            <th className="py-2 text-sm font-normal text-muted">Select</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.id} className="border-b border-dark hover:bg-primary-bg/30">
              <td className="py-2 text-sm">
                <div className="flex items-center gap-2">
                  {token.token_name} {token.token_symbol ? `(${token.token_symbol})` : ''}
                </div>
              </td>
              <td className="py-2 text-sm">{parseFloat(token.balance).toLocaleString()}</td>
              <td className="py-2 text-sm">${parseFloat(token.current_worth).toFixed(2)}</td>
              <td className="py-2 text-sm text-center">
                <Button 
                  size="sm" 
                  variant="outline"
                  disabled={!isLatest || (selectedTokenId && String(selectedTokenId) !== String(token.id))}
                  className={`${String(selectedTokenId) === String(token.id) ? 'bg-accent text-white' : ''}`}
                  onClick={() => onSelect(token.id, token.token_name)}
                >
                  {String(selectedTokenId) === String(token.id) ? '✓' : 'Select'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Main component
export default function SellToken({ 
  auth, 
  userTokens, 
  prefilledToken, 
  initialMessage,
  message,
  selectedToken,
  currentAmount,
  userName
}) {
  // State management
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState(prefilledToken?.id || selectedToken?.id || null);
  const [selectedTokenName, setSelectedTokenName] = useState(prefilledToken?.token_name || selectedToken?.token_name || null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [tokensToShow, setTokensToShow] = useState(2);
  const [optionsLocked, setOptionsLocked] = useState(false);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ 
          behavior: "smooth",
          block: "end"
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Initialize chat
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      
      // Add initial user message
      const userMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: "I want to sell tokens"
      };
      
      setMessages([userMessage]);
      setIsProcessing(true);
      
      // Initial response
      setTimeout(() => {
        const systemMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: {
            messageType: 'token_selection',
            text: `Hello ${userName || 'there'}, select a token to sell:`
          }
        };
        
        setMessages(prev => [...prev, systemMessage]);
        setIsProcessing(false);
      }, 800);
    }
  }, [isInitialized, userTokens, userName]);
  
  // Handle incoming messages
  useEffect(() => {
    if (message && !isInitialized) {
      setMessages([message]);
      setIsInitialized(true);
      
      if (message.content.messageType === 'token_selection') {
        setIsInputEnabled(true);
      }
    } else if (message && isInitialized) {
      setMessages(prev => [...prev, message]);
      setIsProcessing(false);
      setOptionsLocked(false);
    }
  }, [message, isInitialized, selectedToken]);

  // Render message content based on type
  const renderMessageContent = (content, isLatest) => {
    if (!content || !content.messageType) return content;
    
    switch (content.messageType) {
      case 'error':
        return formatError(content.text);
        
      case 'token_selection':
        return (
          <div className="space-y-3">
            <p className="text-base">{content.text}</p>
            <TokenGrid 
              tokens={userTokens.slice(0, tokensToShow)} 
              selectedTokenId={selectedTokenId}
              onSelect={handleTokenSelect}
              isLatest={isLatest}
            />
            {userTokens.length > tokensToShow && (
              <div>
                <Button 
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={!!selectedTokenId || isProcessing || !isLatest}
                >
                  Show More ({userTokens.length - tokensToShow})
                </Button>
              </div>
            )}
          </div>
        );
        
      case 'amount_selection':
        return (
          <div className="space-y-3">
            <p className="text-base">{content.text}</p>
            <div className="mt-2 p-3 bg-primary-bg rounded-md border border-dark">
              <p className="text-sm text-muted">Available: {parseFloat(content.balance).toLocaleString()}</p>
            </div>
            {content.options && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {content.options.map((option, index) => (
                  <Button 
                    key={index}
                    variant="outline"
                    onClick={() => handleOptionClick(option.value)}
                    disabled={optionsLocked || isProcessing || !isLatest}
                  >
                    {option.text}
                  </Button>
                ))}
              </div>
            )}
          </div>
        );
        
      case 'quote_confirmation':
        return (
          <div className="space-y-3">
            <p className="text-base">{content.text}</p>
            {content.quote && formatSellDetails(content.quote)}
            
            {content.options && (
              <div className="flex gap-3">
                {content.options.map((option, index) => (
                  <Button 
                    key={index}
                    onClick={() => handleOptionClick(option.value)}
                    variant={option.value === 'yes' ? 'default' : 'outline'}
                    disabled={optionsLocked || isProcessing || !isLatest}
                  >
                    {option.text}
                  </Button>
                ))}
              </div>
            )}
          </div>
        );
        
      case 'success':
        return (
          <div className="space-y-3">
            <p className="text-base">{content.text}</p>
            {content.transaction && formatSuccess(content.transaction)}
            
            {content.options && (
              <div className="mt-3">
                {content.options.map((option, index) => (
                  <Button 
                    key={index}
                    onClick={() => handleOptionClick(option.value)}
                    variant="default"
                    disabled={optionsLocked || isProcessing || !isLatest}
                  >
                    {option.text}
                  </Button>
                ))}
              </div>
            )}
          </div>
        );
        
      case 'no_tokens':
        return (
          <div className="space-y-3">
            <p className="text-base">{content.text}</p>
          </div>
        );
        
      default:
        return content.text || '';
    }
  };


  const handleTokenSelect = (tokenId, tokenName) => {
    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: `I'll sell ${tokenName}`
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    setSelectedTokenId(String(tokenId));
    setSelectedTokenName(tokenName);
    
    // Request to backend
    router.post(route('sell-token.action'), {
      action: 'select_token',
      token_id: tokenId
    }, {
      preserveState: true,
      preserveScroll: true,
      onError: () => {
        setSelectedTokenId(null);
        setSelectedTokenName(null);
        setIsProcessing(false);
        
        const errorMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: {
            messageType: 'error',
            text: 'Failed to select token. Please try again.'
          }
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    });
  };

  // Option click handler
  const handleOptionClick = (value) => {
    if (!value || optionsLocked) return;
    
    setOptionsLocked(true);

    if (value === 'custom') {
      setShowCustomInput(true);
      setIsInputEnabled(true);
      return;
    }
    
    if (value === 'restart') {
      router.visit('/selling', { preserveState: false });
      return;
    }
    
    // Amount selection
    if (selectedTokenId && !currentAmount) {
      const userMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: `Sell ${value} tokens`
      };
      setMessages(prev => [...prev, userMessage]);
      
      setIsProcessing(true);
      handleAmountSubmit(value);
      return;
    }
    
    // Confirmation
    if (selectedTokenId && currentAmount) {
      const userMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: value === 'yes' ? 'Confirm sell' : 'Cancel'
      };
      setMessages(prev => [...prev, userMessage]);
      
      setIsProcessing(true);
      handleExecuteSell(value);
      return;
    }
  };

  const handleAmountSubmit = (amount) => {
    router.post(route('sell-token.action'), {
      action: 'process_amount',
      amount: amount,
      token_id: selectedTokenId
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setIsProcessing(false);
        setOptionsLocked(false);
        setInput("");
        setShowCustomInput(false);
      },
      onError: () => {
        setIsProcessing(false);
        
        const errorMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: {
            messageType: 'error',
            text: 'Failed to get quote. Try a different amount.'
          }
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    });
  };


  const handleExecuteSell = (confirmation) => {
    if (!selectedTokenId || !currentAmount) return;
    
    if (confirmation === 'no') {
      router.visit('/selling', { preserveState: false });
      return;
    }
    
    setIsProcessing(true);
    
    router.post(route('sell-token.action'), {
      action: 'execute_sell',
      token_id: selectedTokenId,
      amount: currentAmount,
      confirmation: confirmation
    }, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        setIsProcessing(false);
        setOptionsLocked(false);
      },
      onError: () => {
        setIsProcessing(false);
        
        const errorMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: {
            messageType: 'error',
            text: 'Transaction failed. Please try again.'
          }
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    });
  };

  // Custom amount handler
  const handleCustomAmount = () => {
    if (!input || !input.trim() || !selectedTokenId) return;
    
    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: `Sell ${input} tokens`
    };
    setMessages(prev => [...prev, userMessage]);
    
    setIsProcessing(true);
    handleAmountSubmit(input);
  };

  // Load more tokens
  const handleLoadMore = () => {
    const increment = 5;
    const newTokensToShow = Math.min(tokensToShow + increment, userTokens.length);
    setTokensToShow(newTokensToShow);
  };

  // Check if input should be disabled
  const canAcceptInput = () => {
    return showCustomInput;
  };

  // Submit handler
  const handleSubmit = () => {
    if (!input.trim()) return;
    
    if (showCustomInput && selectedTokenId) {
      handleCustomAmount();
    } else {
      const userMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: input
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInput('');
    }
  };

  // Main component render
  return (
    <AdminPanelLayout title="Sell Token">
      <Head title="Sell Token" />
      
      <div className="min-h-screen bg-app antialiased">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="space-y-5">
            <ScrollArea className="h-[65vh] pr-3 mb-4" ref={scrollRef}>
              <div className="space-y-5">
                {messages.map((message, index) => {
                  const isLatest = index === messages.length - 1;
                  return (
                    <div 
                      key={`msg-${message.id}-${index}`} 
                      className={`flex items-start gap-3 ${message.type === "user" ? "flex-row-reverse" : ""}`}
                    >
                      {message.type === "assistant" && (
                        <div className="w-8 flex justify-center">
                          <Avatar className="w-8 h-8 bg-primary-dark">
                            <BotIcon className="w-5 h-5 text-white" />
                          </Avatar>
                        </div>
                      )}
                      <div 
                        className={`${message.type === "user" 
                          ? "bg-accent text-white"
                          : "bg-primary-bg text-content border border-dark"
                        } rounded-xl p-3 max-w-[80%]`}
                      >
                        <div className="space-y-3">
                          {typeof message.content === 'string' ? (
                            <p className="text-base whitespace-pre-line">{message.content}</p>
                          ) : (
                            renderMessageContent(message.content, isLatest)
                          )}
                        </div>
                      </div>
                      {message.type === "user" && (
                        <div className="w-8 flex justify-center">
                          <Avatar className="w-8 h-8 bg-accent-dark">
                            <span className="text-xs text-white font-medium">You</span>
                          </Avatar>
                        </div>
                      )}
                    </div>
                  );
                })}
                {isProcessing && <ThinkingIndicator />}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
            <div className="relative mt-4">
              <Textarea
                value={input}
                onChange={e => {
                  if (showCustomInput) {
                    // Numbers only for amount
                    const value = e.target.value.replace(/[^\d.]/g, '');
                    const parts = value.split('.');
                    if (parts.length <= 2 && value.length <= 10) {
                      setInput(value);
                    }
                  } else {
                    if (e.target.value.length <= 100) {
                      setInput(e.target.value);
                    }
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={!canAcceptInput()}
                placeholder={showCustomInput ? "Enter amount..." : "Type a message..."}
                className={`w-full min-h-[100px] p-4 bg-primary-bg border-dark
                           text-content resize-none rounded-lg
                           ${!canAcceptInput() ? 'opacity-50 cursor-not-allowed' : ''}`}
                maxLength={100}
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-3">
                <span className="text-base text-muted font-medium">
                  {input.length}/100
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSubmit}
                  disabled={!canAcceptInput() || !input.trim()}
                  className="rounded-md bg-accent-light hover:bg-accent text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminPanelLayout>
  );
} 