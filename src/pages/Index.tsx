
import { useState, useEffect } from "react";
import { JsonEditor } from "@/components/JsonEditor";
import { JsonViewer } from "@/components/JsonViewer";
import { GraphVisualizer } from "@/components/GraphVisualizer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import pako from "pako";
import { 
  Share2, 
  Check, 
  AlertCircle, 
  Copy, 
  Trash2, 
  Code, 
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Helmet } from "react-helmet";

const sampleJson = `{
  "name": "JSONVerse Explorer",
  "version": "1.0.0",
  "features": ["formatting", "validation", "visualization"],
  "isAwesome": true,
  "stats": {
    "users": 1000,
    "rating": 4.9
  }
}`;

const Index = () => {
  const [jsonInput, setJsonInput] = useState("");
  const [formattedJson, setFormattedJson] = useState("");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [activeTab, setActiveTab] = useState("formatted");
  const [jsonSize, setJsonSize] = useState(0);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check for shared JSON in URL
  useEffect(() => {
    const sharedJson = searchParams.get("json");
    const compressedJson = searchParams.get("c");
    
    if (compressedJson) {
      try {
        // Decompress the data
        const decodedData = atob(compressedJson);
        const charData = decodedData.split('').map(x => x.charCodeAt(0));
        const binData = new Uint8Array(charData);
        const decompressedData = pako.inflate(binData);
        // Convert Uint8Array to string
        const textDecoder = new TextDecoder('utf-8');
        const resultString = textDecoder.decode(decompressedData);
        
        setJsonInput(resultString);
        validateAndFormatJson(resultString);
      } catch (error) {
        toast({
          title: "Error loading compressed JSON",
          description: "The shared JSON could not be decompressed correctly.",
          variant: "destructive",
        });
      }
    } else if (sharedJson) {
      try {
        const decodedJson = atob(sharedJson);
        setJsonInput(decodedJson);
        validateAndFormatJson(decodedJson);
      } catch (error) {
        toast({
          title: "Error loading shared JSON",
          description: "The shared JSON could not be loaded correctly.",
          variant: "destructive",
        });
      }
    } else {
      // Set sample JSON if no shared JSON
      setJsonInput(sampleJson);
      validateAndFormatJson(sampleJson);
    }
  }, [searchParams]);

  const validateAndFormatJson = (input: string) => {
    if (!input.trim()) {
      setIsValid(null);
      setValidationMessage("");
      setFormattedJson("");
      setJsonSize(0);
      return;
    }

    try {
      const parsedJson = JSON.parse(input);
      const formatted = JSON.stringify(parsedJson, null, 2);
      setFormattedJson(formatted);
      setIsValid(true);
      setValidationMessage("JSON is valid");
      
      // Calculate size of JSON
      const sizeInBytes = new Blob([input]).size;
      setJsonSize(sizeInBytes);
    } catch (error) {
      setIsValid(false);
      setValidationMessage(error instanceof Error ? error.message : "Invalid JSON");
      setFormattedJson("");
      setJsonSize(0);
    }
  };

  const handleInputChange = (value: string) => {
    setJsonInput(value);
    validateAndFormatJson(value);
  };

  const handleClearClick = () => {
    setJsonInput("");
    setFormattedJson("");
    setIsValid(null);
    setValidationMessage("");
    setJsonSize(0);
    toast({
      title: "Editor cleared",
      description: "The JSON editor has been cleared.",
    });
  };

  const handleCopyClick = () => {
    if (formattedJson) {
      navigator.clipboard.writeText(formattedJson);
      toast({
        title: "Copied to clipboard",
        description: "The formatted JSON has been copied to your clipboard.",
      });
    }
  };

  const handleShareClick = () => {
    if (jsonInput && isValid) {
      let shareUrl;
      
      // For large JSON (>10KB), use compression
      if (jsonSize > 10 * 1024) {
        // Convert string to Uint8Array for compression
        const textEncoder = new TextEncoder();
        const uint8Array = textEncoder.encode(jsonInput);
        
        // Compress using pako
        const compressed = pako.deflate(uint8Array, { level: 9 });
        
        const binaryString = Array.from(compressed).map(byte => String.fromCharCode(byte)).join('');
        const base64Encoded = btoa(binaryString);
        
        shareUrl = `${window.location.origin}/?c=${encodeURIComponent(base64Encoded)}`;
        
        toast({
          title: "Using compressed sharing",
          description: `Your ${(jsonSize / 1024).toFixed(2)}KB JSON has been compressed for sharing.`,
        });
      } else {
        // Standard base64 encoding for smaller JSON
        const encodedJson = btoa(jsonInput);
        shareUrl = `${window.location.origin}/?json=${encodedJson}`;
      }
      
      navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: "Share link created",
        description: "A link to share this JSON has been copied to your clipboard.",
      });
      
      // Update URL without full page reload (if not too large)
      if (jsonSize <= 100 * 1024) { // Only update URL for reasonably sized JSON
        if (jsonSize > 10 * 1024) {
          // Convert string to Uint8Array for compression
          const textEncoder = new TextEncoder();
          const uint8Array = textEncoder.encode(jsonInput);
          
          // Compress using pako
          const compressed = pako.deflate(uint8Array, { level: 9 });
          
          const binaryString = Array.from(compressed).map(byte => String.fromCharCode(byte)).join('');
          const base64Encoded = btoa(binaryString);
          navigate(`/?c=${encodeURIComponent(base64Encoded)}`, { replace: true });
        } else {
          const encodedJson = btoa(jsonInput);
          navigate(`/?json=${encodedJson}`, { replace: true });
        }
      }
    } else {
      toast({
        title: "Cannot share",
        description: "Please enter valid JSON before sharing.",
        variant: "destructive",
      });
    }
  };

  // Format the JSON size in a human-readable way
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>JSONVerse Explorer - Free JSON Formatter, Validator and Visualizer Tool</title>
        <meta name="description" content="Format, validate, visualize, and share your JSON data with JSONVerse Explorer's powerful online tool supporting large files and graph visualization." />
        <meta name="keywords" content="json formatter, json validator, json visualizer, json viewer, json parser, json editor, json tools, online json, json graph, json share" />
      </Helmet>
      
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">JSONVerse Explorer</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/20 hover:bg-white/30 border-none text-white"
              onClick={handleShareClick}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-white/20 hover:bg-white/30 border-none text-white"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>About JSONVerse Explorer</SheetTitle>
                  <SheetDescription>
                    A powerful JSON viewer, formatter and validator
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4 text-sm">
                  <div>
                    <h3 className="font-semibold">Large JSON Support</h3>
                    <p className="text-muted-foreground mt-1">
                      JSONVerse optimizes large JSON files using pagination, data sampling, and compression for sharing.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Graph View</h3>
                    <p className="text-muted-foreground mt-1">
                      For large datasets, the Graph view shows a subset of nodes with zoom and pagination controls.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Sharing</h3>
                    <p className="text-muted-foreground mt-1">
                      JSON data larger than 10KB is automatically compressed before sharing.
                    </p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 p-4 flex flex-col gap-4">
        <section className="mb-4">
          <h2 className="sr-only">JSON Formatter and Validator</h2>
          <p className="text-muted-foreground text-sm">
            JSONVerse Explorer is a free online tool that helps you format, validate, visualize, and share JSON data. 
            Supports large files with advanced features like graph visualization and compression for sharing.
          </p>
        </section>
        
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold flex items-center">
                <Code className="mr-2 h-5 w-5" />
                JSON Input
              </h2>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleClearClick}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 bg-background border rounded-lg overflow-hidden">
              <JsonEditor value={jsonInput} onChange={handleInputChange} />
            </div>
            
            <div className="mt-2 flex items-center justify-between">
              <div>
                {isValid === true && (
                  <div className="flex items-center text-green-500 text-sm">
                    <Check className="mr-1 h-4 w-4" />
                    {validationMessage}
                  </div>
                )}
                {isValid === false && (
                  <div className="flex items-center text-destructive text-sm">
                    <AlertCircle className="mr-1 h-4 w-4" />
                    {validationMessage}
                  </div>
                )}
              </div>
              {jsonSize > 0 && (
                <div className="text-xs text-muted-foreground">
                  Size: {formatSize(jsonSize)}
                </div>
              )}
            </div>
          </div>
          
          <div className="w-full md:w-1/2 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <TabsList>
                  <TabsTrigger value="formatted">Formatted</TabsTrigger>
                  <TabsTrigger value="visualizer">Graph View</TabsTrigger>
                </TabsList>
                
                {activeTab === "formatted" && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleCopyClick}
                    disabled={!formattedJson}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <TabsContent value="formatted" className="flex-1 mt-0">
                <div className="h-full bg-background border rounded-lg overflow-hidden">
                  <JsonViewer json={formattedJson} />
                </div>
              </TabsContent>
              
              <TabsContent value="visualizer" className="flex-1 mt-0">
                <div className="h-full bg-background border rounded-lg overflow-hidden">
                  <GraphVisualizer 
                    jsonData={isValid && formattedJson ? JSON.parse(formattedJson) : null}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <footer className="border-t bg-background">
        <div className="container mx-auto p-4 text-center text-sm text-muted-foreground">
          <p>JSONVerse Explorer - A powerful JSON formatter, validator, and visualizer tool</p>
          <p className="mt-1">Format, validate, visualize, and share your JSON data with our free online tool.</p>
          <div className="mt-3 flex justify-center gap-4">
            <a href="#features" className="hover:underline">Features</a>
            <a href="#privacy" className="hover:underline">Privacy</a>
            <a href="#terms" className="hover:underline">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
