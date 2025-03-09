import React, { useState, useRef, useEffect } from 'react'
import { Send, BotIcon, Coins, AlertCircle, CheckCircle2, XCircle, Upload, FileSymbol, Info, ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AdminPanelLayout } from "@/components/admin-panel/admin-panel-layout"
import { router } from '@inertiajs/react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import axios from 'axios'
import { useForm } from '@inertiajs/react'

const AiThinkingIndicator = () => (
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


// Error formatting helper
const formatError = (message) => (
  <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-600 rounded-lg">
    <AlertCircle className="w-5 h-5" />
    <span>{message}</span>
  </div>
);

// File Uploader Component
const FileUploader = ({ onFileSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleFile = (file) => {
    // File validation logic
    setSelectedFile(file);
    onFileSelected(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div 
      className={`w-full p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-200 ${
        isDragging ? 'border-primary bg-primary/10' : 'border-neutral-600 bg-neutral-800/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileInput}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      
      {selectedFile ? (
        <div className="space-y-2">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <p className="text-green-500 font-medium">File selected: {selectedFile.name}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Upload className="h-12 w-12 text-neutral-400 mx-auto" />
          <p className="text-lg font-medium text-neutral-300">Drag and drop your token logo here</p>
          <p className="text-sm text-neutral-400">or click to browse files</p>
          <p className="text-xs text-neutral-500 mt-2">PNG, JPG or JPEG (max 2MB)</p>
        </div>
      )}
    </div>
  );
};

// Token Details Form Component
const TokenDetailsForm = ({ onSubmit }) => {
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showSocials, setShowSocials] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate description is provided
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    
    setError('');
    onSubmit({
      description,
      // Other fields are also passed
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
        <Textarea
          id="description"
          placeholder="Describe your token..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`bg-neutral-800 border-neutral-700 ${error ? 'border-red-500' : ''}`}
          required
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      
      {/* Social media fields section */}
      <Collapsible 
        open={showSocials} 
        onOpenChange={setShowSocials}
        className="border border-neutral-700 rounded-lg p-2"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Social Media & Links (Optional)</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
              {showSocials ? 
                <ChevronDown className="h-4 w-4 text-neutral-400" /> : 
                <Plus className="h-4 w-4 text-neutral-400" />
              }
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent className="pt-3 space-y-3">
          {/* Social media form fields */}
        </CollapsibleContent>
      </Collapsible>
      
      <Button type="submit" className="w-full">Continue</Button>
    </form>
  );
};

// Combined Token Details Form Component
const CombinedTokenDetailsForm = ({ onSubmit, className, initialValues }) => {
  const [tokenName, setTokenName] = useState(initialValues?.token_name || '');
  const [tokenSymbol, setTokenSymbol] = useState(initialValues?.token_symbol || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [errors, setErrors] = useState({});
  const [showSocials, setShowSocials] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    // Validate token name
    if (!tokenName.trim()) {
      newErrors.name = 'Token name is required';
    }
    
    // Validate token symbol
    if (!tokenSymbol.trim()) {
      newErrors.symbol = 'Token symbol is required';
    }
    
    // Validate description
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    onSubmit({
      token_name: tokenName,
      token_symbol: tokenSymbol.toUpperCase(),
      description,
      // Other fields are also passed
    });
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className || ''}`}>
      {/* Token Name and Symbol side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="token-name">Token Name <span className="text-red-500">*</span></Label>
          <Input
            id="token-name"
            placeholder="My Awesome Token"
            value={tokenName}
            onChange={(e) => {
              if (e.target.value.length <= 15) {
                setTokenName(e.target.value);
              }
            }}
            className={`bg-neutral-800 border-neutral-700 ${errors.name ? 'border-red-500' : ''}`}
            required
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="token-symbol">Token Symbol <span className="text-red-500">*</span></Label>
          <Input
            id="token-symbol"
            placeholder="MYT"
            value={tokenSymbol}
            onChange={(e) => {
              const value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase();
              if (value.length <= 3) {
                setTokenSymbol(value);
              }
            }}
            className={`bg-neutral-800 border-neutral-700 ${errors.symbol ? 'border-red-500' : ''}`}
            required
            maxLength={3}
          />
          {errors.symbol && <p className="text-sm text-red-500">{errors.symbol}</p>}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
        <Textarea
          id="description"
          placeholder="Describe your token..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`bg-neutral-800 border-neutral-700 ${errors.description ? 'border-red-500' : ''}`}
          required
        />
        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
      </div>
      
      {/* Social media section (collapsed by default) */}
      <Collapsible 
        open={showSocials} 
        onOpenChange={setShowSocials}
        className="border border-neutral-700 rounded-lg p-2"
      >
        {/* Collapsible header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Social Media & Links (Optional)</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
              {showSocials ? 
                <ChevronDown className="h-4 w-4 text-neutral-400" /> : 
                <Plus className="h-4 w-4 text-neutral-400" />
              }
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent className="pt-3 space-y-3">
          {/* Social media form fields */}
        </CollapsibleContent>
      </Collapsible>
      
      <Button type="submit" className="w-full">Continue</Button>
    </form>
  );
};

export default function LaunchToken({ 
  initialMessage, 
  initialType, 
  message, 
  error 
}) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState([])
  const [aiThinking, setAiThinking] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInputEnabled, setIsInputEnabled] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  const [showCustomAmount, setShowCustomAmount] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const scrollRef = useRef(null)
  const bottomRef = useRef(null)
  const [isFileUploaderVisible, setIsFileUploaderVisible] = useState(false)
  const [activeForm, setActiveForm] = useState(null)

  // Auto-scroll to the latest message
  useEffect(() => {
    if (messages.length > 2) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (!isInitialized && initialMessage && initialType) {
      setIsInputEnabled(false);
      
      // Start with user message
      const userMessage = {
        id: Date.now().toString(),
        type: "user",
        content: "Hi, I'd like to launch a token"
      };
      setMessages([userMessage]);
      
      // Show AI thinking indicator
      setAiThinking(true);
      
      // Show welcome message after delay
      setTimeout(() => {
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: initialMessage,
          options: [
            { text: "Launch Token On S.fun", value: "launch", action: "name_input" },
            { text: "Launching Using AI On S.fun", value: "ai_launch", action: "ai_launch" }
          ]
        };
        setMessages(prev => [...prev, aiResponse]);
        setAiThinking(false);
        setIsInitialized(true);
        setIsInputEnabled(false);
      }, 1500);
    }
  }, [initialMessage, initialType, isInitialized]);

  // Process incoming messages
  useEffect(() => {
    if (message && !aiThinking) {
      setIsInputEnabled(false);
      
      if (message.type === 'amount_input' && showCustomAmount) {
        setIsInputEnabled(true);
        return;
      }

      // Format the message based on its type
      let formattedContent = null;
      
      // Switch case for different message types
      switch (message.type) {
        case 'name_input':
          formattedContent = (
            <div className="space-y-4">
              <p className="text-lg">{message.content}</p>
            </div>
          );
          setIsInputEnabled(true);
          break;
        
        case 'name_error':
          formattedContent = formatError(message.content);
          setIsInputEnabled(true);
          break;
        
        // Other message type cases
        default:
          formattedContent = <p>{message.content}</p>;
      }

      // Add formatted message to the chat
      if (formattedContent) {
        const aiResponse = {
          id: Date.now().toString(),
          type: "assistant",
          content: formattedContent,
          options: message.options
        };
        setMessages(prev => [...prev, aiResponse]);
      }
    }
  }, [message, showCustomAmount, aiThinking]);

  // Handle errors
  useEffect(() => {
    if (error) {
      setAiThinking(false);
      const errorMessage = {
        id: Date.now().toString(),
        type: "assistant",
        content: formatError(error)
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [error]);

  // Core handler functions
  const handleTokenNameSubmit = () => {
    const tokenName = input.trim();
    
    if (!tokenName) return;
    
    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      content: tokenName
    };
    setMessages(prev => [...prev, userMessage]);
    setAiThinking(true);
    setInput("");
    
    // Send to server
    router.post('/tokenlaunch', { 
      action: 'name_input',
      token_name: tokenName 
    }, {
      preserveState: true,
      preserveScroll: true,
      only: ['message', 'error'],
      onSuccess: () => {
        setAiThinking(false);
      },
      onError: () => {
        setAiThinking(false);
        const errorMessage = {
          id: Date.now().toString(),
          type: "assistant",
          content: formatError("Failed to process token name. Please try again.")
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsInputEnabled(true);
      }
    });
  };

  const handleOptionClick = (messageType, value, action) => {
    switch (action) {
      case 'name_input':
        // Create combined form
        const combinedFormResponse = {
          id: Date.now().toString(),
          type: "assistant",
          content: (
            <div className="space-y-4" onClick={e => e.stopPropagation()}>
              <p className="text-lg">Let's create your token! Please provide the following details:</p>
            </div>
          ),
          options: []
        };
        setMessages(prev => [...prev, combinedFormResponse]);
        setIsInputEnabled(false);
        setActiveForm('combined');
        break;
      
      case 'retry':
        setInput("");
        setIsInputEnabled(true);
        break;
      
      case 'ai_launch':
        // Handle AI launch
        setAiThinking(true);
        
        router.post('/tokenlaunch', 
          { action: 'ai_launch' },
          {
            preserveState: true,
            preserveScroll: true,
            only: ['message', 'error'],
            onSuccess: (page) => {
              setAiThinking(false);
              
              if (page.props.message) {
                // Add AI response to chat
                const aiGeneratedResponse = {
                  id: Date.now().toString(),
                  type: "assistant",
                  ...page.props.message
                };
                setMessages(prev => [...prev, aiGeneratedResponse]);
                
                // Set form with generated values
                setActiveForm({
                  token_name: page.props.message.token_name,
                  token_symbol: page.props.message.token_symbol,
                  description: page.props.message.description
                });
              }
            },
            onError: () => {
              setAiThinking(false);
              
              // Show error message
              const errorMessage = {
                id: Date.now().toString(),
                type: "assistant",
                content: "Sorry, there was an error generating your token details. Please try again or create your token manually.",
                options: [
                  { text: "Try Again", value: "retry", action: "ai_launch" },
                  { text: "Manual Creation", value: "manual", action: "name_input" }
                ]
              };
              setMessages(prev => [...prev, errorMessage]);
            }
          }
        );
        break;
      
      // Other action handlers
      default:
        break;
    }
  };

  const handleCombinedDetailsSubmit = (details) => {
    setAiThinking(true);
    
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      content: `Token Details: ${details.token_name} (${details.token_symbol})`
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Submit to server
    router.post('/tokenlaunch', {
      action: 'combined_details_input',
      ...details
    }, {
      preserveState: true,
      preserveScroll: true,
      only: ['message', 'error'],
      onSuccess: () => {
        setAiThinking(false);
      },
      onError: () => {
        setAiThinking(false);
        const errorMessage = {
          id: Date.now().toString(),
          type: "assistant",
          content: formatError("Failed to process token details. Please try again.")
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    });
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    // If showing custom amount
    if (showCustomAmount) {
      handleCustomAmountSubmit();
      return;
    }
    
    // Find the most recent assistant message
    const lastAssistantMessage = [...messages].reverse().find(msg => msg.type === "assistant");
    
    // Determine action based on context
    if (lastAssistantMessage) {
      // Check for message options
      if (lastAssistantMessage.options && lastAssistantMessage.options.length > 0) {
        const action = lastAssistantMessage.options[0]?.action;
        
        if (action === 'name_input') {
          handleTokenNameSubmit();
          return;
        }
        
        // Handle other actions
      }
    }
    
    // Default: add as user message
    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      content: input
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
  };

  return (
    <AdminPanelLayout title="Launch Token">
      <div className="min-h-screen bg-black/95 antialiased">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <div className="space-y-6">
            <ScrollArea className="h-[60vh] pr-4 mb-6" ref={scrollRef}>
              <div className="space-y-6">
                {/* Map through messages and render them */}
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.type === "assistant" && (
                      <div className="w-8 flex justify-center">
                        <Avatar className="w-8 h-8 border bg-gradient-to-br from-red-500 via-orange-500 to-blue-500">
                          <BotIcon className="w-5 h-5 text-white" />
                        </Avatar>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        message.type === "user"
                          ? "bg-gradient-to-r from-purple-600 to-purple-800 text-white"
                          : "bg-gradient-to-r from-neutral-800 to-neutral-900 text-white border border-neutral-700"
                      }`}
                    >
                      <div className="space-y-4">
                        {typeof message.content === 'string' ? (
                          <p className="text-lg whitespace-pre-line">{message.content}</p>
                        ) : (
                          message.content
                        )}
                        {message.options && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {message.options.map((option, index) => (
                              <Button
                                key={index}
                                onClick={() => handleOptionClick(message.type, option.value, option.action)}
                                variant={option.value === 'yes' ? 'default' : 'secondary'}
                                size="lg"
                                disabled={message.id !== messages[messages.length - 1].id}
                                className="flex-1 min-w-[120px]"
                              >
                                {option.text}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {message.type === "user" && (
                      <div className="w-8 flex justify-center">
                        <Avatar className="w-8 h-8 border bg-gradient-to-br from-purple-500 to-purple-700">
                          <span className="text-xs text-white font-medium">You</span>
                        </Avatar>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Active form rendering */}
                {activeForm && (
                  <div className="flex items-start gap-3 justify-start">
                    <div className="w-8 flex justify-center">
                      <Avatar className="w-8 h-8 border bg-gradient-to-br from-red-500 via-orange-500 to-blue-500">
                        <BotIcon className="w-5 h-5 text-white" />
                      </Avatar>
                    </div>
                    <div className="max-w-[80%] rounded-2xl p-4 bg-gradient-to-r from-neutral-800 to-neutral-900 text-white border border-neutral-700">
                      <div className="space-y-2">
                        <p className="text-lg mb-1">Let's create your token! Please provide the following details:</p>
                        <CombinedTokenDetailsForm 
                          onSubmit={(details) => {
                            handleCombinedDetailsSubmit(details);
                            setActiveForm(null);
                          }} 
                          className="bg-transparent border-0 mt-0"
                          initialValues={typeof activeForm === 'object' ? activeForm : null}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* AI Thinking indicator */}
                {aiThinking && <AiThinkingIndicator />}
                
                {/* Auto-scroll anchor */}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Input area */}
            <div className="relative mt-8">
              <Textarea
                value={input}
                onChange={e => {
                  // Input validation based on context
                  setInput(e.target.value);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={!isInputEnabled}
                placeholder={"Type your response..."}
                className={`w-full min-h-[130px] px-6 py-5 bg-neutral-900/90 text-white rounded-xl
                           ${!isInputEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                maxLength={30}
              />
              <div className="absolute bottom-5 right-5 flex items-center gap-4">
                <span className="text-lg text-neutral-500 font-medium tracking-wide">
                  {input.length}/30
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSubmit}
                  disabled={!isInputEnabled}
                  className="h-11 w-11 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                >
                  <Send className="h-6 w-6 rotate-45" />
                  <span className="sr-only">Send message</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminPanelLayout>
  );
}
