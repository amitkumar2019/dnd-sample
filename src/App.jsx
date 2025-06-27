import { useState, useRef, useEffect } from "react";
import { DndContext, rectIntersection, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import "./App.css";

const AssayBox = ({ item, isDropping }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: transform
      ? `translate(${transform.x || 0}px, ${transform.y || 0}px) scale(${isDragging ? 1.05 : transform.scale || 1})`
      : "none",
    transition: isDragging || isDropping ? "none" : transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : "auto",
    boxShadow: isDragging ? "0 4px 12px rgba(0, 0, 0, 0.2)" : "none",
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`assay-box-outer ${isDragging ? "dragging" : ""} ${isDropping ? "dropping" : ""}`}
    >
      <div className="assay-box">{item.generalName}</div>
    </div>
  );
};

const PlaceholderBox = ({ tier }) => {
  const { attributes, listeners, setNodeRef } = useSortable({ id: `placeholder-tier-${tier}` });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="assay-box-outer"
    >
      <div className="assay-box placeholder" style={{ color: "#666", textAlign: "center" }}>
        No items available
      </div>
    </div>
  );
};

function App() {
  const initialData = [
    {
      id: "1-1",
      tier: 1,
      type: "biochemical",
      generalName: "Biochemical Inhibition",
      details: "IC<sub>50</sub> < 0.02 μM",
      property: "IC50",
      description: "50% inhibition constant for biochemical assay",
    },
    {
      id: "1-2",
      tier: 1,
      type: "biochemical",
      generalName: "Biochemical Selectivity",
      details: "Selectivity > 100",
      property: "Selectivity",
      description: "Selectivity over similar enzyme that we want to avoid inhibiting",
    },
    {
      id: "1-3",
      tier: 1,
      type: "cellular",
      generalName: "Target-Based Cellular Assay",
      details: "EC<sub>50</sub> < 0.2 μM",
      property: "Cell-based activity",
      description: "50% inhibition constant for affecting the biochemical pathway in a cell model",
    },
    {
      id: "2-1",
      tier: 2,
      type: "ADME",
      generalName: "Aqueous Solubility",
      details: "Buffer pH 7.4 > 30 µM",
      property: "Solubility",
      description: "Kinetic aqueous solubility in a buffer with pH value of 7.4",
    },
    {
      id: "2-2",
      tier: 2,
      type: "ADME",
      generalName: "Permeability (MDCK/Caco2)",
      details: "P<sub>app A>B</sub> > 5 × 10<sup>–6</sup> cm/s",
      property: "Permeability",
      description: "Permeability across a cellular model of an epithelial layer to assess intestinal absorption",
    },
    {
      id: "2-3",
      tier: 2,
      type: "ADME",
      generalName: "CYP Inhibition",
      details: "(2D6, 3A4, 2C19, 2C9) IC<sub>50</sub> > 10 µM",
      property: "CYP inhibition",
      description: "Percent inhibition of the most common drug metabolizing CYP450 isoforms",
    },
    {
      id: "2-4",
      tier: 2,
      type: "ADME",
      generalName: "Microsomal stability (hu/mo)",
      details: "Cl<sub>int</sub> < 10 µL/min/mg",
      property: "Microsomal stability",
      description: "Stability of compounds with incubation with isolated liver microsomes",
    },
    {
      id: "2-5",
      tier: 2,
      type: "ADME",
      generalName: "ChromLogD",
      details: "pH 7.4 < 4.5",
      property: "Hydrophobicity",
      description: "Hydrophobicity measured using the chromatographic estimation method",
    },
    {
      id: "2-6",
      tier: 2,
      type: "ADME",
      generalName: "Plasma Protein Binding",
      details: "< 99%",
      property: "Plasma protein binding",
      description: "Percent bound to human plasma proteins",
    },
    {
      id: "3-1",
      tier: 3,
      type: "in vivo",
      generalName: "Mouse Dose Rangefinding",
      details: "",
      property: "Maximum tolerated dose",
      description: "Maximum dose tested with no adverse effects",
    },
    {
      id: "3-2",
      tier: 3,
      type: "in vivo",
      generalName: "Mouse PK",
      details: "C<sub>max</sub> > EC90",
      property: "Pharmacokinetics",
      description: "Half-life, peak concentration, and AUC in mouse",
    },
    {
      id: "3-3",
      tier: 3,
      type: "in vivo",
      generalName: "Mouse Efficacy",
      details: "≥ Best-in-class",
      property: "Minimal effective dose",
      description: "Minimal dose for desired effect in animal model",
    },
  ];

  const [workflowData, setWorkflowData] = useState(initialData);
  const [isDropping, setIsDropping] = useState(false);
  const [activeTier, setActiveTier] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [allTiers, setAllTiers] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const rootRef = useRef(null);

  useEffect(() => {
    let tiers = initialData.map(data => data.tier);
    tiers = Array.from(new Set(tiers));
    setAllTiers(tiers);
  }, []);

  const restrictToRoot = ({ transform, draggingNodeRect }) => {
    if (!rootRef.current || !draggingNodeRect) return transform;

    const rootRect = rootRef.current.getBoundingClientRect();
    const { width, height } = draggingNodeRect;

    const minX = -draggingNodeRect.left + rootRect.left;
    const maxX = rootRect.right - draggingNodeRect.left - width;
    const minY = -draggingNodeRect.top + rootRect.top;
    const maxY = rootRect.bottom - draggingNodeRect.top - height;

    return {
      ...transform,
      x: Math.max(minX, Math.min(transform.x, maxX)),
      y: Math.max(minY, Math.min(transform.y, maxY)),
    };
  };

  const handleDragStart = ({ active }) => {
    if(active.id.startsWith("placeholder-tier-")) return;
    const activeItem = workflowData.find((item) => item.id === active.id);
    setActiveId(active.id);
    setActiveTier(activeItem.tier);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over || active.id.startsWith("placeholder-tier-")) return;
    let targetTier;
    let activeItem = workflowData.find((item) => item.id === active.id);
    let overItem;
    if(over.id.startsWith("placeholder-tier-")) {
      targetTier = parseInt(over.id.replace("placeholder-tier-", ""));
    }else {
      overItem = workflowData.find((item) => item.id === over.id);
      if (!activeItem || !overItem) return;
    }
    if (activeItem.tier !== (overItem?.tier || targetTier)) {
      setWorkflowData((prevData) => {
        const newData = [...prevData];
        const activeIndex = newData.findIndex((item) => item.id === active.id);
        const overIndex = !targetTier ? newData.findIndex((item) => item.id === over.id) : 0;

        newData[activeIndex].tier = overItem?.tier || targetTier;
        const updatedData = arrayMove(newData, activeIndex, overIndex).sort((a, b) => a.tier - b.tier);

        return updatedData;
      });
      const activeTier = overItem?.tier || targetTier; 
      setActiveTier(activeTier);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    setIsDropping(true);
    setActiveTier(null);
    setActiveId(null);

    if ((!over || active.id === over.id || active.id.startsWith("placeholder-tier-"))) {
      setTimeout(() => setIsDropping(false), 0);
      return;
    }
    setWorkflowData((prevData) => {
      const newData = [...prevData];
      const activeIndex = newData.findIndex((item) => item.id === active.id);
      const overIndex = newData.findIndex((item) => item.id === over.id);

      const activeItem = newData[activeIndex];
      const overItem = newData[overIndex];

      if (activeItem.tier === overItem.tier) {
        const updatedData = arrayMove(newData, activeIndex, overIndex).sort((a, b) => a.tier - b.tier);
        setTimeout(() => setIsDropping(false), 0);
        return updatedData;
      }

      setTimeout(() => setIsDropping(false), 0);
      return newData;
    });
  };

  const groupedData = workflowData.reduce((acc, data) => {
    if (!acc[data.tier]) acc[data.tier] = [];
    acc[data.tier].push(data);
    return acc;
  }, {});

  const allItemIds = workflowData.map((item) => item.id);

  return (
    <div className="app" ref={rootRef}>
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToRoot]}
      >
        <h1 className="text-2xl font-bold mb-4">Prototype for Assay Cascade</h1>
        <SortableContext items={allItemIds} strategy={rectSortingStrategy}>
          {allTiers.map((tier, index) => (
            <div className="tier-box-outer" key={index}>
              <div className={`tier-box ${activeTier === Number(tier) ? "active-tier" : ""}`}>
                {groupedData[tier] && groupedData[tier].length > 0 ? groupedData[tier].map((item) => (
                  <AssayBox key={item.id} item={item} isDropping={isDropping && activeId === item.id} />
                )) : 
                <PlaceholderBox tier={tier} />
              }
              </div>
            </div>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default App;