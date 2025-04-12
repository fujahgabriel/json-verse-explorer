
import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Plus, Minus } from "lucide-react";
import { safeNumberConversion } from "@/utils/typeFixes";

interface GraphVisualizerProps {
  jsonData: any | null;
}

interface Node {
  id: string;
  name: string;
  value?: string;
  children?: Node[];
  originalData?: any; // Store original data for expandable nodes
  collapsed?: boolean; // Track if a node is collapsed
}

export const GraphVisualizer = ({ jsonData }: GraphVisualizerProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [nodeLimit, setNodeLimit] = useState(100); // Limit number of visible nodes
  const [totalNodes, setTotalNodes] = useState(0);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [nodesData, setNodesData] = useState<Node | null>(null);
  
  // Convert JSON data to hierarchical format for D3
  const convertToHierarchy = (data: any, key = "root", currentDepth = 0, maxDepth = 2, nodePath = ""): Node => {
    const currentNodePath = nodePath ? `${nodePath}-${key}` : key;
    
    if (data === null) {
      return { id: currentNodePath, name: key, value: "null" };
    }
    
    if (typeof data !== 'object') {
      return { id: currentNodePath, name: key, value: String(data) };
    }
    
    // Check if this node should be collapsed
    const isCollapsed = !expandedNodes.has(currentNodePath) && currentDepth >= maxDepth;
    
    // For very nested objects, collapse if not expanded
    if (isCollapsed) {
      return { 
        id: currentNodePath, 
        name: key, 
        collapsed: true,
        originalData: data,
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
        id: currentNodePath,
        name: key + (data.length > 20 ? ` (showing ${pageStart}-${pageEnd} of ${data.length})` : ''),
        originalData: data,
        children: sampleData.map((item: any, index: number) => 
          convertToHierarchy(item, `${index}`, currentDepth + 1, maxDepth, currentNodePath)
        )
      };
    }
    
    return {
      id: currentNodePath,
      name: key,
      originalData: data,
      children: Object.entries(data)
        .slice(0, nodeLimit) // Limit number of properties shown
        .map(([k, v]) => convertToHierarchy(v, k, currentDepth + 1, maxDepth, currentNodePath))
    };
  };

  // Count total nodes in the JSON structure
  const countNodes = (data: any): number => {
    if (data === null || typeof data !== 'object') {
      return 1;
    }
    
    if (Array.isArray(data)) {
      // Fixed: Explicitly type the initial value and ensure number return type
      return 1 + data.reduce((sum: number, item: any) => sum + countNodes(item), 0);
    }
    
    // Fixed: Explicitly type the initial value and ensure number return type
    return 1 + Object.values(data).reduce((sum: number, value: any) => sum + safeNumberConversion(countNodes(value)), 0);
  };
  
  // Handle node expansion/collapse
  const toggleNode = (nodeId: string, data: any) => {
    setExpandedNodes(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return newExpanded;
    });
  };
  
  // Convert data and initialize visualization
  useEffect(() => {
    if (!jsonData) {
      return;
    }
    
    // Calculate total nodes and convert to hierarchy
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
    
    const hierarchicalData = convertToHierarchy(jsonData);
    setNodesData(hierarchicalData);
  }, [jsonData, expandedNodes, currentPage]);
  
  // Render the graph
  useEffect(() => {
    if (!jsonData || !nodesData) {
      return;
    }
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    const width = svgRef.current?.clientWidth || 800;
    const height = svgRef.current?.clientHeight || 600;
    
    const root = d3.hierarchy(nodesData);
    
    // Apply tree layout
    const treeLayout = d3.tree().size([height * zoomLevel - 100, width * zoomLevel - 160]);
    const treeData = treeLayout(root);
    
    // Create the main SVG element
    const svg = d3.select(svgRef.current)
      .attr("width", width * zoomLevel)
      .attr("height", height * zoomLevel);
    
    // Add the container group for the graph
    const g = svg.append("g")
      .attr("transform", `translate(80, 50) scale(${zoomLevel})`);
    
    // Add dragging behavior
    const dragBehavior = d3.drag<SVGSVGElement, unknown>()
      .on("drag", (event) => {
        // Get the current transform
        const transform = g.attr("transform");
        
        // Parse the translate portion of the transform
        const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (!translateMatch) return;
        
        const currentX = parseFloat(translateMatch[1]);
        const currentY = parseFloat(translateMatch[2]);
        
        // Calculate the new transform with drag offsets, but keep the scale the same
        const scaleMatch = transform.match(/scale\(([^)]+)\)/);
        const scale = scaleMatch ? scaleMatch[1] : zoomLevel;
        
        // Apply the new transform with the dragged position
        g.attr("transform", `translate(${currentX + event.dx}, ${currentY + event.dy}) scale(${scale})`);
      });
    
    // Apply the drag behavior to the SVG element
    svg.call(dragBehavior);
    
    // Add links
    g.selectAll(".link")
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
    const nodes = g.selectAll(".node")
      .data(treeData.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`);
    
    // Add node circles with different colors for expandable nodes
    nodes.append("circle")
      .attr("r", 5)
      .attr("fill", d => {
        if (d.data.collapsed) return "#f97316"; // Orange for collapsed nodes
        if (d.children) return "#3b82f6"; // Blue for parent nodes
        return "#22c55e"; // Green for leaf nodes
      });
    
    // Add expand/collapse buttons for nodes that can be expanded
    nodes.filter(d => d.data.collapsed === true)
      .append("circle")
      .attr("r", 8)
      .attr("cx", 12)
      .attr("fill", "#f97316")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("opacity", 0.7)
      .attr("cursor", "pointer")
      .on("click", (event, d) => toggleNode(d.data.id, d.data.originalData));
    
    // Add plus sign for expandable nodes
    nodes.filter(d => d.data.collapsed === true)
      .append("text")
      .attr("x", 12)
      .attr("y", 3)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#fff")
      .attr("pointer-events", "none")
      .text("+");
    
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
      
  }, [jsonData, currentPage, zoomLevel, nodeLimit, nodesData]);
  
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
      <ScrollArea className="flex-1 relative">
        <div className="text-xs absolute top-2 left-2 bg-background/80 px-2 py-1 rounded z-10">
          Tip: Click and drag to move the graph. Click on orange nodes to expand them.
        </div>
        <svg ref={svgRef} className="w-full h-full min-h-[400px] cursor-move"></svg>
      </ScrollArea>
    </div>
  );
};
