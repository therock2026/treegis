import React from 'react';

interface Proyecto {
  id: string;
  nombre: string;
}

interface PropsSelectorProyecto {
  projects: Proyecto[];
  onProjectChange: (idProyecto: string) => void;
}

const ProjectSelector: React.FC<PropsSelectorProyecto> = ({ projects, onProjectChange }) => {
  const manejarCambio = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onProjectChange(e.target.value);
  };

  return (
    <div id="project-selector">
      <div className="selector-header">
        <img src="/logo.jpg" alt="Logo" className="logo-img" />
        <label htmlFor="projects-select">Proyecto Activo</label>
      </div>
      <div className="select-wrapper">
        <select id="projects-select" onChange={manejarCambio}>
          <option value="">-- Seleccionar --</option>
          {projects.map((proyecto) => (
            <option key={proyecto.id} value={proyecto.id}>
              {proyecto.nombre}
            </option>
          ))}
        </select>
        <span className="material-icons dropdown-arrow">expand_more</span>
      </div>
    </div>
  );
};

export default ProjectSelector;
