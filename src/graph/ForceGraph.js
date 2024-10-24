  import React, { useState, useEffect, useRef } from "react";
  import * as d3 from "d3";
  import data from "./sampleData.json";
  import glossary from "./glossaryData.json";
  import abbrevations from "./abbrevations.json"
  import PDFViewer from "./PDFViewer";
  import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

  function clamp(x, lo, hi) {
    return x < lo ? lo : x > hi ? hi : x;
  }

  const ForceGraph = () => {
    const allLaws = Object.keys(data.lawPageNumbers);
    const svgRef = useRef(null);
    const [nodes, setNodes] = useState(data.nodes);
    const [links, setLinks] = useState(data.links);
    const [highlightedData, setHighlightedData] = useState([]);
    const [searchQuery, setSearchQuery] = useState(""); // State to hold the search query
    const [filteredNodes, setFilteredNodes] = useState(data.nodes);
    const [filteredGlossary, setFilteredGlossary] = useState(Object.keys(glossary));
    const [checkboxes, setCheckboxes] = useState([]);
    const [first, setfirst] = useState(true);

    const myCSS = {
      links: {
        nOpac: 1,
        hoverOpac: 1,
        blurOpac: 0.02,
        nWidth: 0.8,
        hoverWidth: 1.5,
        blurWidth: 0.02
      },
      nodes: {
        nOpac: 1,
        hoverOpac: 1,
        blurOpac: 0.08,
        borderWidth: 2.5
      }
    };

    useEffect(() => {
      setFilteredNodes(nodes);
      const width = window.innerWidth*0.5;
      const height = window.innerHeight*0.98;
      const baseWidth = 1920; // Reference window width (you can adjust this)
      const baseHeight = 1080; // Reference window height (you can adjust this)

      const widthScale = window.innerWidth / baseWidth;
      const heightScale = window.innerHeight / baseHeight;

      const scale = Math.min(widthScale, heightScale); // Use the smaller scale to keep the radius proportional

      const svg = d3.select(svgRef.current)
          .attr("viewBox", [0, 0, width, height])
          .attr("width", width)
          .attr("height", height)
          .attr("style", "background-color: white");

      const nodeRadius = (d) => {


        if (d.total > 35) return 30 * scale;
        else if (d.total >= 10 && d.total < 35) return 25 * scale;
        return 18 * scale;
      };

      svg.append("defs").append("marker")
          .attr("id", "arrowhead")
          .attr("viewBox", "0 0 10 10")
          .attr("refX", 8)
          .attr("refY", 5)
          .attr("markerWidth", 4)
          .attr("markerHeight", 4)
          .attr("orient", "auto-start-reverse")
          .append("path")
          .attr("d", "M 0 0 L 10 5 L 0 10 z");



      let clicked = false;

      const link = svg
          .selectAll(".link")
          .data(links)
          .join("path")
          .classed("link", true)
          .attr("fill", "none")
          .attr("stroke", (d) => glossary[d["Type"]]["color"])
          .attr("stroke-width", myCSS["links"]["nWidth"])
          .attr("opacity", myCSS["links"]["nOpac"])
          .attr("marker-end", (d) => {
            if (d["Type"] !== "NR6" && d["Type"] !== "NR5") {
              return "url(#arrowhead)";
            } else {
              return null;
            }
          })
          .on("mouseover", handleMouseOverLink)
          .on("mouseout", handleMouseOutLink)
          .on("click", handleLinkClick);

      function handleLinkClick(event, d) {
        if (clicked === false) {
          clicked = true;
          handleMouseOverLink(event, d);
        } else {
          clicked = false;
          handleMouseOutLink();
        }
      }
      function handleNodeClick(event, d) {
        if (clicked === false) {
          clicked = true;
          handleMouseOverNode(event, d);
        } else {
          clicked = false;
          handleMouseOutNode();
        }
      }

      const node = svg
          .selectAll(".node")
          .data(nodes)
          .join("g") // Changed from circle to g element to contain both circle and text
          .classed("node", true)
          .classed("fixed", (d) => d.fx !== undefined)
          .attr("cursor","pointer")
          .on("mouseover", handleMouseOverNode)
          .on("mouseout", handleMouseOutNode)
          .on("click", handleNodeClick);

      node.append("circle") // Append circle to each node
          .attr("r", (d) => nodeRadius(d))
          .attr("fill", (d) => {
            if (d.group === "NG7") return "white";
            else if (d.group === "SIP") return "lightgrey";
            return glossary[d["group"]]["color"] || "lightgrey";
          })
          .attr("stroke-width", myCSS["nodes"]["borderWidth"])
          .classed("fixed", (d) => d.fx !== undefined)
          .style("stroke", d => {
            if (d.group === "NG7" || d.group === "SIP") {
              const gradientColors = ["#bd473d", "#939b45", "#244565"];
              const gradient = svg.append("defs")
                  .append("linearGradient")
                  .attr("id", `nodeGradient-${d.id}`)
                  .attr("x1", "0%")
                  .attr("y1", "0%")
                  .attr("x2", "100%")
                  .attr("y2", "100%");

              gradientColors.forEach((color, i) => {
                gradient.append("stop")
                    .attr("offset", `${(i * 100) / (gradientColors.length - 1)}%`)
                    .attr("stop-color", color);
              });

              return `url(#nodeGradient-${d.id})`;
            } else {
              return glossary[d["group"]]["borderColor"] || "black";
            }
          });



      //Append text to each node
      node.append("text")
          .text((d) => d.id)
          .attr("text-anchor", "middle")
          .attr("dy", ".35em")
          .style("fill", (e) => { return glossary[e.group]['textColor'] })
          .style("font-size", "12px");; // color of the text


      const popUpForeignObject = svg.append("foreignObject")
          .attr("width", 200) // Adjust width as needed
          .attr("height", 200) // Adjust height as needed
          .style("display", "none")
          .style("position", "absolute") // Position the pop-up box absolutely
          .style("z-index", nodes.length); // Set a high z-index value to ensure it's on top;

      popUpForeignObject.append("xhtml:div")
          .style("width", 200)
          .style("height", 200)
          .style("background-color", "white") // Adjust background color as needed
          .style("border", "1px solid black") // Adjust border as needed
          .style("border-radius", "5px") // Adjust border radius as needed
          .style("padding", "5px") // Adjust padding as needed
          .attr("id", "popUpContent");


      function handleMouseOverNode(event, d) {
        popUpForeignObject.style("display", "block");
        // Calculate position of pop-up box relative to hovered node
        let nodeX = d.x + nodeRadius(d) + 10; // Adjust as needed
        let nodeY = d.y - nodeRadius(d) - 60; // Adjust as needed

        // Get the dimensions of the SVG
        const svgWidth = parseInt(svg.attr("width"));
        const svgHeight = parseInt(svg.attr("height"));

        // Check if the pop-up box exceeds the SVG bounds horizontally
        if (nodeX + 250 > svgWidth) {
          nodeX = d.x - 250 - 10; // Position to the left of the node
        }

        // Check if the pop-up box exceeds the SVG bounds vertically (bottom)
        if (nodeY + 200 > svgHeight) {
          nodeY = svgHeight - 200; // Align to the bottom edge of the SVG
        }

        // Check if the pop-up box exceeds the SVG bounds vertically (top)
        if (nodeY < 0) {
          nodeY = 0; // Align to the top edge of the SVG
        }
        popUpForeignObject.attr("x", nodeX)
            .attr("y", nodeY);
        // Update pop-up box content
        popUpForeignObject.select("div").html(`
          <h4 style="margin: 5px;">${d.NodeText}</h4>
          <h6 style="margin: 5px;">${d.Subtext}</h6>
        `);

        if (clicked === false) {
          const connectedLinks = links.filter(
              (link) => link.source === d || link.target === d
          );
          setHighlightedData(connectedLinks);
          const connectedNodes = connectedLinks
              .flatMap((link) => [link.source, link.target])
              .filter((node) => node !== d);

          d3.select(event.currentTarget).attr("opacity", myCSS["nodes"]["hoverOpac"]);

          svg.selectAll(".node")
              .filter((node) => connectedNodes.includes(node) || node === d)
              .attr("opacity", myCSS["nodes"]["hoverOpac"]);

          svg.selectAll(".node")
              .filter((node) => !connectedNodes.includes(node) && node !== d)
              .attr("opacity", myCSS["nodes"]["blurOpac"]);

          svg.selectAll(".link")
              .filter((link) => connectedLinks.includes(link))
              .attr("opacity", myCSS["links"]["hoverOpac"]).attr("stroke-width", myCSS["links"]["hoverWidth"]);

          svg.selectAll(".link")
              .filter((link) => !connectedLinks.includes(link))
              .attr("opacity", myCSS["links"]["blurOpac"]);
        }
      }

      function handleMouseOutNode(event, d) {
        popUpForeignObject.style("display", "none");
        if (clicked === false) {
          setHighlightedData([]);

          svg.selectAll(".node").attr("opacity", myCSS["nodes"]["nOpac"]);
          svg.selectAll(".link").attr("opacity", myCSS["links"]["nOpac"]).attr("stroke-width", myCSS["links"]["nWidth"]);
        }
      }

      function handleMouseOverLink(event, d) {
        if (clicked === false) {
          const connectedNodes = [d.source, d.target];

          d3.select(event.currentTarget).attr("opacity", myCSS["links"]["hoverOpac"]);
          let arr = [];
          arr.push(d)
          setHighlightedData(arr);
          svg.selectAll(".node")
              .filter((node) => connectedNodes.includes(node))
              .attr("opacity", myCSS["nodes"]["hoverOpac"]);

          svg.selectAll(".node")
              .filter((node) => !connectedNodes.includes(node))
              .attr("opacity", myCSS["nodes"]["blurOpac"]);

          svg.selectAll(".link")
              .filter((link) => link === d)
              .attr("opacity", myCSS["links"]["hoverOpac"]).attr("stroke-width", myCSS["links"]["hoverWidth"]);

          svg.selectAll(".link")
              .filter((link) => link !== d)
              .attr("opacity", myCSS["links"]["blurOpac"]);
        }
      }

      function handleMouseOutLink(event, d) {
        if (clicked === false) {
          setHighlightedData([]);
          svg.selectAll(".node").attr("opacity", myCSS["nodes"]["nOpac"]);
          svg.selectAll(".link").attr("opacity", myCSS["links"]["nOpac"]).attr("stroke-width", myCSS["links"]["nWidth"]);
        }
      }

      svg.on("click", handleSvgClick);

      function handleSvgClick(event) {
        if (!event.target.classList.contains("node") && !event.target.classList.contains("link") && !clicked) {
          clicked = false;
          handleMouseOutNode();
        }
      }

      const invertedScale = 1/scale;

      const forceCollide = d3.forceCollide().strength(0.5)
          .radius(scale*34);

      const forceX = d3.forceX()
          .strength(0.2).x(width / 2);
      const forceY = d3.forceY()
          .strength(0.2).y(height / 2);

      const simulation = d3.forceSimulation(nodes)
          .force("link", d3.forceLink(links).id(({ index: i }) => nodes[i].id))
        //  .force("charge", d3.forceManyBody())
           .force("center", d3.forceCenter(width / 2, height / 2))
          .force("collide", forceCollide)
          .force("x", forceX)
          .force("y", forceY)
          .stop();

      let upShift = 0
      let leftShift = 0

      simulation.on("tick", () => {
        node.attr("transform", d => {
          // Calculate x position
          const newX = clamp(d.x, 0, width);
          // Calculate y position
          const newY = clamp(d.y, 0, height);
          return `translate(${newX - upShift - leftShift},${newY - upShift})`;
        });
        link.attr("d", d => { return linkArc(d, nodeRadius(d.source) + 2, nodeRadius(d.target) + 2) });
      });
      simulation.nodes(nodes).tick(nodes.length);
      simulation.restart();

      function linkArc(d, srcpadding, targetPadding) {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.hypot(dx, dy);

        const theta = Math.atan2(dy, dx);

        const sourceX = d.source.x + (Math.cos(theta) * srcpadding);
        const sourceY = d.source.y + (Math.sin(theta) * srcpadding);
        const targetX = d.target.x - (Math.cos(theta) * targetPadding);
        const targetY = d.target.y - (Math.sin(theta) * targetPadding);

        return `M${sourceX - upShift - leftShift},${sourceY - upShift}A${dr},${dr} 0 0,1 ${targetX - upShift - leftShift},${targetY - upShift}`;
      }
    }, [nodes, links]);

    const handleSearch = (event) => {
      setSearchQuery(event.target.value);
    };

    // Filter nodes based on the search query whenever the query changes
    useEffect(() => {
      const filterNodes = async () => {
        const filtered = data.nodes.filter((node) =>
            node.NodeText.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredNodes(filtered);
      };
      filterNodes();
    }, [searchQuery]);

    useEffect(() => {
      if (highlightedData.length > 0) {
        const mySet = new Set();
        highlightedData.map((d) => {
          mySet.add(d.Type);
          mySet.add(d.source.group);
          mySet.add(d.target.group);
          return d;
        })
        const myArray = Array.from(mySet);
        setFilteredGlossary(myArray);
      } else {
        setFilteredGlossary(Object.keys(glossary));
      }
    }, [highlightedData])

    const addtoFilter = (group) => {
      if (!checkboxes.includes(group)) {
        setCheckboxes([...checkboxes, group])
      } else {
        setCheckboxes(checkboxes.filter(item => item !== group))
      }
    }
    useEffect(() => {
      if (checkboxes && checkboxes.length > 0) {
        setfirst(false);
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        const ids = [];
        const grouped = data.nodes.filter((e) => { return checkboxes.includes(e.group) });
        grouped.map((a) => {
          ids.push(a.id)
          return a;
        });
        const groupedLinks = data.links.filter((e) => { return ids.includes(e.source.id) && ids.includes(e.target.id) });
        setNodes(grouped);
        setLinks(groupedLinks);
      } else {
        if (first === false) {
          const svg = d3.select(svgRef.current);
          svg.selectAll("*").remove();
          setNodes(data.nodes);
          setLinks(data.links);
        }
      }
    }, [checkboxes])

    const toggleModal = () => {
      setModalOpen(!modalOpen);
    };

    const togglePdfOpenerModal = () => {
      setPdfOpener(!pdfOpener);
    };

    const [modalOpen, setModalOpen] = useState(false);
    const [pdfOpener, setPdfOpener] = useState(false);
    const [nodecardSelected,setnodecardSelected] = useState(0);
    const filterSearchedNode=(e)=>{
      setnodecardSelected(e);
    }
    useEffect(()=>{
      if(nodecardSelected!==0){
        setfirst(false);
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        const ids = [];
        ids.push(nodecardSelected.id);
        const groupedLinks = data.links.filter((e) => {
          if(e.source.id===nodecardSelected.id ){
            ids.push(e.target.id);
            return true;
          }else if(e.target.id===nodecardSelected.id){
            ids.push(e.source.id);
            return true;
          }
          else{
            return false;
          }
        });
        const grouped = data.nodes.filter((e) => { return ids.includes(e.id) });
        setNodes(grouped);
        setLinks(groupedLinks);
      }else{
        if (first === false) {
          const svg = d3.select(svgRef.current);
          svg.selectAll("*").remove();
          setNodes(data.nodes);
          setLinks(data.links);
          setSearchQuery('');
        }
      }
    },[nodecardSelected])

    const formatSubtext = (Subtext, linksArray, linkColor) => {
      return Subtext.split(/[^a-zA-Z0-9]+/).map((item, index) => (
          <React.Fragment key={index}>
            {linksArray.includes(item.trim()) ? (
                <a style={{ color: linkColor}} href={`#${item.trim()}`} onClick={(e)=>lawClicked(e,item.trim())}>{item.trim()} ;</a>
            ) : (
                <span style={{ color: linkColor}}>{item.trim()} ;</span>
            )}
            {" "}
          </React.Fragment>
      ));
    };
    const [pdfSearch, setpdfSearch] = useState('');

    const lawClicked = (e,searchItem) => {
      e.stopPropagation();
      setpdfSearch(data.lawPageNumbers[searchItem].pageNumber)
      togglePdfOpenerModal();
    }

    return (
        <div style={{ display: "flex" }}>
          {modalOpen &&
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 999 }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '20px', borderRadius: '5px' }}>
                  <h3>Instructions</h3>
                  <p>Random 1</p>
                  <p>Random 2</p>
                  <p>Random 3</p>
                  <p>Random 4</p>
                  <button style={{ backgroundColor:'#adb25e'}} onClick={toggleModal}>Close</button>
                </div>
              </div>
          }
          {pdfOpener &&
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 999 }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '20px', borderRadius: '5px' }}>
                  <PDFViewer pdfUrl={"https://housedocs.house.gov/energycommerce/ppacacon.pdf"} searchText={pdfSearch} />
                  <button style={{ backgroundColor:'#adb25e'}} onClick={togglePdfOpenerModal}>Close</button>
                </div>
              </div>
          }
          <div key="info" style={{ width: '30vw', backgroundColor: 'white', height: '99vh', border: `0.0px solid black`}}>
            <h4 style={{ backgroundColor:'#3b3b3b', color:'white',border:'5px solid #3b3b3b',
              borderRadius:10, margin:5, padding: 10}}>Your New Health Care System</h4>

            <div>
              <div>
                <input
                    type="text"
                    placeholder="Search for entity ..."
                    value={searchQuery}
                    onChange={handleSearch}
                    style={{
                      margin: "10px",
                      padding: "5px",
                      width: "90%", // Take up full width of parent
                      borderRadius: "5px", // Rounded corners
                      border: "2px solid black" // Black border
                    }}
                />
              </div>
              {nodecardSelected!==0?<div style={{ display:'flex', margin:10}}>
                <div style={{ width:'90%'}}><h4 style={{ margin: 0}}> Selected : <span style={{color:'#223e66'}}>{nodecardSelected.NodeText}</span></h4></div>
                <div> <span style={{
                  fontSize:15,marginRight: 10, backgroundColor:'#bf453d',color: 'white', border: `1px solid #bf453d`,
                  paddingLeft: 3, paddingRight: 3, borderRadius: 100,cursor: 'pointer'
                }} onClick={() => setnodecardSelected(0)}>
                    &#10006;
                  </span></div>
              </div>:<></>}
            </div>

            {highlightedData && highlightedData.length > 0 ?
                <div style={{ overflowY: 'auto', height: '85vh' }}>
                  {highlightedData.map((e, index) => {// Assuming you have a function to get color based on type

                    return (
                        <div key={index} style={{ display: 'flex', margin: 5 }}>
                          <div style={{
                            flex: '40%', textAlign: 'center',
                            border: `${myCSS["nodes"]["borderWidth"]}px solid ${glossary[e.source.group]['borderColor']}`,
                            backgroundColor: glossary[e.source.group]['color'], padding: 5, borderRadius: 10
                          }}>
                            <h5 style={{ color: glossary[e.source.group]['textColor'] }}>{e.source.id}. {e.StartNode}</h5>
                            <h6 style={{ color: glossary[e.source.group]['textColor'] }}>{e.source.Subtext?formatSubtext(e.source.Subtext,allLaws,glossary[e.source.group]['textColor']):''}</h6>
                            {Object.keys(abbrevations).map((abbr) => {
                              if ((e.source.Subtext && e.source.Subtext.includes(abbr)) || (e.source.NodeText && e.source.NodeText.includes(abbr))) {
                                return <h6 style={{ color: glossary[e.source.group]['textColor'], margin: 5, marginTop: 20, fontSize: 12 }}>*{abbr} - {abbrevations[abbr]}</h6>
                              }
                              return <></>
                            })}
                          </div>
                          <div style={{ flex: '20%', justifyContent: 'center', height: 25 }}>
                            {(e["Type"] === "NR6" || e["Type"] === "NR5") ?
                                <div><span style={{ color: glossary[e.Type]['color'], fontSize: 60 }}>&#x2015;</span>
                                  <h6>{e.EdgeText}</h6></div>
                                :
                                <div><span style={{ color: glossary[e.Type]['color'], fontSize: 50 }}>&#x279E;</span>
                                  <h6>{e.EdgeText}</h6></div>
                            }

                          </div>

                          <div style={{
                            flex: '40%', textAlign: 'center',
                            border: `${myCSS["nodes"]["borderWidth"]}px solid ${glossary[e.target.group]['borderColor']}`,
                            backgroundColor: glossary[e.target.group]['color'], padding: 5, borderRadius: 10
                          }}>
                            <h5 style={{ color: glossary[e.target.group]['textColor'] }}>{e.target.id}. {e.EndNode}</h5>
                            <h6 style={{ color: glossary[e.target.group]['textColor'] }}>{e.target.Subtext?formatSubtext(e.target.Subtext,allLaws,glossary[e.target.group]['textColor']):''}</h6>
                            {Object.keys(abbrevations).map((abbr) => {
                              if ((e.target.Subtext && e.target.Subtext.includes(abbr)) || (e.target.NodeText && e.target.NodeText.includes(abbr))) {
                                return <h6 style={{ color: glossary[e.target.group]['textColor'], margin: 5, marginTop: 20, fontSize: 12 }}>*{abbr} - {abbrevations[abbr]}</h6>
                              }
                              return <></>
                            })}

                          </div>
                        </div>
                    );
                  })}</div>
                :
                <div style={{ overflowY: 'auto', height: '85vh' }}>

                  {filteredNodes.map((e, index) => {// Assuming you have a function to get color based on type

                    return (
                        <div style={{
                          textAlign: 'center',
                          border: `${myCSS["nodes"]["borderWidth"]}px solid ${glossary[e.group]['borderColor']}`,
                          backgroundColor: glossary[e.group]['color'], padding: 5, margin: 5, borderRadius: 10, cursor: 'pointer'
                        }} onClick={()=>{filterSearchedNode(e)}}
                        >
                          <h5 style={{ color: glossary[e.group]['textColor'], margin: 5 }}>{e.id}. {e.NodeText}</h5>
                          <h6 style={{ color: glossary[e.group]['textColor'], margin: 5 }}>{e.Subtext?formatSubtext(e.Subtext,allLaws,glossary[e.group]['textColor']):''}</h6>
                          {Object.keys(abbrevations).map((abbr) => {
                            if ((e.Subtext && e.Subtext.includes(abbr)) || (e.NodeText && e.NodeText.includes(abbr))) {
                              return <h6 style={{ color: glossary[e.group]['textColor'], margin: 5, marginTop: 20, fontSize: 12 }}>*{abbr} - {abbrevations[abbr]}</h6>
                            }
                            return <></>
                          })}
                        </div>
                    );
                  })}
                </div>
            }
          </div>
          <div style={{ width: '50vw', overflow: 'hidden', height: '99vh', border: `0.0px solid blue`}}>
            <TransformWrapper options={{ invert: true }}>
              <TransformComponent>
                <svg
                    ref={svgRef}
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
          <div style={{ width: '20vw', overflowY: 'auto', height: '99vh', border: `0.0px solid black` }}>
            <div style={{ display:'flex', marginTop:10, marginBottom:10, alignItems:'center'}}>
              <span style={{ width:'20%'}}>
              </span>
              <h2 style={{margin:0, width:'60%'}}>
                GLOSSARY
              </h2>
              <span>
                <span id='modal' onClick={toggleModal} style={{ backgroundColor:'#223e66',
                  fontSize: 15, marginLeft: 10, color: 'white', border: `2px solid #223e66`,
                  paddingLeft: 5, paddingRight: 5, borderRadius: 100,cursor: 'pointer', fontStyle:'bold'
                }}>&#63;
                </span>
              </span>

            </div>
            {checkboxes.length > 0 ?<h4 style={{ margin: 0, width:'50%',
              fontSize:15,marginLeft: '24%', backgroundColor:'#bf453d',color: 'white', border: `1px solid #bf453d`,
              paddingLeft: 3, paddingRight: 3, borderRadius: 100,cursor: 'pointer', marginTop:10
            }} onClick={() => setCheckboxes([])}>
              Clear Filters
            </h4>:<></>}
            <div style={{ backgroundColor: '#fcfafa', marginTop: '1vh' }}>
              <h4 style={{ margin: 5, backgroundColor: '#3b3b3b', color: 'white' }}>New Government</h4>
              {
                filteredGlossary.filter((e) => { return e.startsWith("NG") }).map((e) => {
                  return <div style={{ display: 'flex', marginLeft: 10}}><input style={{cursor: 'pointer' }} type="checkbox" checked={checkboxes.includes(e)} onChange={() => addtoFilter(e)} />
                    <h5 style={{
                      width: '80%',padding:'0.4vh', margin: '0.4vh', borderRadius: '2vh', color: glossary[e]['textColor'], border: `${myCSS["nodes"]["borderWidth"]}px solid ${glossary[e]['borderColor']}`,
                      backgroundColor: glossary[e]['color'],
                    }}>{glossary[e].name}
                    </h5></div>
                })
              }
            </div>
            <div style={{ backgroundColor: '#fcfafa', marginTop: '2vh' }}>
              <h4 style={{ margin: 5, backgroundColor: '#3b3b3b', color: 'white' }}>Expanded Government</h4>
              {
                filteredGlossary.filter((e) => { return e.startsWith("EG") }).map((e) => {
                  return <div style={{ display: 'flex', marginLeft: 10 }}><input style={{cursor: 'pointer' }} type="checkbox" checked={checkboxes.includes(e)} onChange={() => addtoFilter(e)} />
                    <h5 style={{
                      width: '80%',padding:'0.4vh', margin: '0.4vh', borderRadius: '2vh', color: glossary[e]['textColor'], border: `${myCSS["nodes"]["borderWidth"]}px solid ${glossary[e]['borderColor']}`,
                      backgroundColor: glossary[e]['color'],
                    }}>{glossary[e].name}</h5></div>
                })
              }
            </div>
            <div style={{ backgroundColor: '#fcfafa', marginTop: '2vh' }}>
              <h4 style={{ margin: 5, backgroundColor: '#3b3b3b', color: 'white' }}>Private</h4>
              {
                filteredGlossary.filter((e) => { return e.startsWith("P") }).map((e) => {
                  return <div style={{ display: 'flex', marginLeft: 10 }}><input style={{cursor: 'pointer' }} type="checkbox" checked={checkboxes.includes(e)} onChange={() => addtoFilter(e)} />
                    <h5 style={{
                      width: '80%',padding:'0.4vh', margin: '0.4vh', borderRadius: '2vh', color: glossary[e]['textColor'], border: `${myCSS["nodes"]["borderWidth"]}px solid ${glossary[e]['borderColor']}`,
                      backgroundColor: glossary[e]['color'],
                    }}>{glossary[e].name}</h5></div>
                })
              }
            </div>
            <div style={{ backgroundColor: '#fcfafa', marginTop: '2vh' }}>
              <h4 style={{ margin: 5, backgroundColor: '#3b3b3b', color: 'white' }}>New Relationships</h4>
              {
                filteredGlossary.filter((e) => { return e.startsWith("NR") }).map((e) => {
                  return <div style={{ display: 'flex', width: '80%', marginLeft: '8%' }}>
                    {e === "NR5" || e === "NR6" ? <span style={{ color: glossary[e]['color'], fontSize: 40 }}>&#x2015;</span>
                        : <span style={{ color: glossary[e]['color'], fontSize: 30 }}>&#x279E;</span>}<h5 style={{ width: '80%', margin: '0.3vh', marginLeft: '9%', paddingTop: 5 }}>
                    {glossary[e].name}
                  </h5></div>
                })
              }
            </div>
          </div>
        </div>
    );
  };

  export default ForceGraph;
