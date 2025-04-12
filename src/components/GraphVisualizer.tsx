
import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface GraphVisualizerProps {
  jsonData: any | null;
}

interface Node {
  id: string;
  name: string;
  value?: string;
  children?: Node[];
}

export const GraphVisualizer = ({ jsonData }: GraphVisualizerProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [nodeLimit, setNodeLimit] = useState(100); // Limit number of visible nodes
  const [totalNodes, setTotalNodes] = useState(0);
  
  // Convert JSON data to hierarchical format for D3
  const convertToHierarchy = (data: any, key = "root", currentDepth = 0, maxDepth = 3): Node => {
    if (data === null) {
      return { id: key, name: key, value: "null" };
    }
    
    if (typeof data !== 'object') {
      return { id: key, name: key, value: String(data) };
    }
    
    // For very nested objects, limit depth to prevent browser hanging
    if (currentDepth >= maxDepth) {
      return { 
        id: key, 
        name: key, 
        value: Array.isArray(data) 
          ? `Array[${data.length} items]` 
          : `Object{${Object.keys(data).length} props}` 
      };
    }
    
    if (Array.isArray(data)) {
      // For large arrays, sample the data
      let sampleData = data;
      if (data.length > 20) {
        const itemsPerPage = 20;
        const startIdx = currentPage * itemsPerPage;
        sampleData = data.slice(startIdx, startIdx + itemsPerPage);
      }
      
      // Fix: Ensure numeric types for page calculation and display
      const pageStart = (currentPage * 20) + 1;
      const pageEnd = Math.min((currentPage + 1) * 20, data.length);
      
      return {
        id: key,
        name: key + (data.length > 20 ? ` (showing ${pageStart}-${pageEnd} of ${data.length})` : ''),
        children: sampleData.map((item, index) => 
          convertToHierarchy(item, `${key}-${currentPage * 20 + index}`, currentDepth + 1, maxDepth)
        )
      };
    }
    
    return {
      id: key,
      name: key,
      children: Object.entries(data)
        .slice(0, nodeLimit) // Limit number of properties shown
        .map(([k, v]) => convertToHierarchy(v, k, currentDepth + 1, maxDepth))
    };
  };

  // Count total nodes in the JSON structure
  const countNodes = (data: any): number => {
    if (data === null || typeof data !== 'object') {
      return 1;
    }
    
    if (Array.isArray(data)) {
      return 1 + data.reduce((sum, item) => sum + countNodes(item), 0);
    }
    
    return 1 + Object.values(data).reduce((sum, value) => sum + countNodes(value), 0);
  };
  
  useEffect(() => {
    if (!jsonData) {
      return;
    }
    
    // Calculate total nodes
    const count = countNodes(jsonData);
    setTotalNodes(count);
    
    // Adjust node limit based on total size
    if (count > 500) {
      setNodeLimit(50);
    } else if (count > 200) {
      setNodeLimit(100);
    } else {
      setNodeLimit(200);
    }
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    const width = svgRef.current?.clientWidth || 800;
    const height = svgRef.current?.clientHeight || 600;
    
    const hierarchicalData = convertToHierarchy(jsonData);
    const root = d3.hierarchy(hierarchicalData);
    
    // Apply zoom transform
    const treeLayout = d3.tree().size([height * zoomLevel - 100, width * zoomLevel - 160]);
    const treeData = treeLayout(root);
    
    const svg = d3.select(svgRef.current)
      .attr("width", width * zoomLevel)
      .attr("height", height * zoomLevel)
      .append("g")
      .attr("transform", `translate(80, 50) scale(${zoomLevel})`);
    
    // Add links
    svg.selectAll(".link")
      .data(treeData.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1.5)
      .attr("d", d3.linkHorizontal<d3.HierarchyPointLink<Node>, d3.HierarchyPointNode<Node>>()
        .x(d => d.y)
        .y(d => d.x)
      );
    
    // Add nodes
    const nodes = svg.selectAll(".node")
      .data(treeData.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`);
    
    // Add node circles
    nodes.append("circle")
      .attr("r", 5)
      .attr("fill", d => d.children ? "#3b82f6" : "#22c55e");
    
    // Add node labels (key names)
    nodes.append("text")
      .attr("dy", -10)
      .attr("x", d => d.children ? -8 : 8)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .attr("font-size", "12px")
      .attr("fill", "currentColor")
      .text(d => d.data.name);
    
    // Add node values (for leaf nodes)
    nodes.filter(d => !d.children && d.data.value)
      .append("text")
      .attr("dy", 15)
      .attr("x", 8)
      .attr("text-anchor", "start")
      .attr("font-size", "10px")
      .attr("fill", "#888")
      .text(d => {
        const value = d.data.value;
        if (value && value.length > 20) {
          return value.substring(0, 20) + "...";
        }
        return value;
      });
      
  }, [jsonData, currentPage, zoomLevel, nodeLimit]);
  
  // Handle pagination for large arrays
  const hasNextPage = jsonData && Array.isArray(jsonData) && jsonData.length > (currentPage + 1) * 20;
  const hasPrevPage = currentPage > 0;
  
  if (!jsonData) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground p-4">
        Enter valid JSON to see the graph visualization
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center p-2 border-b">
        <div className="text-sm text-muted-foreground">
          {totalNodes > 0 && `${totalNodes} nodes found${totalNodes > nodeLimit ? ` (showing max ${nodeLimit})` : ''}`}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.2))}
            disabled={zoomLevel <= 0.5}
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.2))}
            disabled={zoomLevel >= 2}
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </Button>
          {Array.isArray(jsonData) && jsonData.length > 20 && (
            <>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentPage(prev => prev - 1)}
                disabled={!hasPrevPage}
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm">{currentPage + 1}</span>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={!hasNextPage}
                title="Next page"
              >
                <ChevronRight size={16} />
              </Button>
            </>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <svg ref={svgRef} className="w-full h-full min-h-[400px]"></svg>
      </ScrollArea>
    </div>
  );
};
