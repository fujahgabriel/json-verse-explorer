
import { useState, useEffect } from "react";
import { JsonEditor } from "@/components/JsonEditor";
import { JsonViewer } from "@/components/JsonViewer";
import { GraphVisualizer } from "@/components/GraphVisualizer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { 
  Share2, 
  Check, 
  AlertCircle, 
  Copy, 
  Trash2, 
  Code, 
  LineChart 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams, useNavigate } from "react-router-dom";

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
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check for shared JSON in URL
  useEffect(() => {
    const sharedJson = searchParams.get("json");
    if (sharedJson) {
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
      return;
    }

    try {
      const parsedJson = JSON.parse(input);
      const formatted = JSON.stringify(parsedJson, null, 2);
      setFormattedJson(formatted);
      setIsValid(true);
      setValidationMessage("JSON is valid");
    } catch (error) {
      setIsValid(false);
      setValidationMessage(error instanceof Error ? error.message : "Invalid JSON");
      setFormattedJson("");
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
      const encodedJson = btoa(jsonInput);
      const shareUrl = `${window.location.origin}/?json=${encodedJson}`;
      
      navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: "Share link created",
        description: "A link to share this JSON has been copied to your clipboard.",
      });
      
      // Update URL without full page reload
      navigate(`/?json=${encodedJson}`, { replace: true });
    } else {
      toast({
        title: "Cannot share",
        description: "Please enter valid JSON before sharing.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
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
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 p-4 flex flex-col gap-4">
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
            
            <div className="mt-2 flex items-center">
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
          JSONVerse Explorer - A powerful JSON viewer, formatter and validator
        </div>
      </footer>
    </div>
  );
};

export default Index;
