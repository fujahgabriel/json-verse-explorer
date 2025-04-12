
import { useRef, useEffect } from "react";
import * as d3 from "d3";

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
  
  // Convert JSON data to hierarchical format for D3
  const convertToHierarchy = (data: any, key = "root"): Node => {
    if (data === null) {
      return { id: key, name: key, value: "null" };
    }
    
    if (typeof data !== 'object') {
      return { id: key, name: key, value: String(data) };
    }
    
    if (Array.isArray(data)) {
      return {
        id: key,
        name: key,
        children: data.map((item, index) => convertToHierarchy(item, `${key}-${index}`))
      };
    }
    
    return {
      id: key,
      name: key,
      children: Object.entries(data).map(([k, v]) => convertToHierarchy(v, k))
    };
  };
  
  useEffect(() => {
    if (!jsonData || !svgRef.current) {
      return;
    }
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    const hierarchicalData = convertToHierarchy(jsonData);
    const root = d3.hierarchy(hierarchicalData);
    
    // Create tree layout
    const treeLayout = d3.tree().size([height - 100, width - 160]);
    const treeData = treeLayout(root);
    
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(80, 50)`);
    
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
      
  }, [jsonData]);
  
  if (!jsonData) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground p-4">
        Enter valid JSON to see the graph visualization
      </div>
    );
  }
  
  return (
    <div className="w-full h-full overflow-auto">
      <svg ref={svgRef} className="w-full h-full min-h-[400px]"></svg>
    </div>
  );
};
