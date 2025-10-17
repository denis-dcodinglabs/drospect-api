// src/components/ReusableTable.jsx
import React from "react";

const ReusableTable = ({ columns, data }) => {
  return (
    <div className="overflow-x-auto  rounded-lg max-h-[500px] overflow-y-auto sticky top-0">
      <table className="min-w-full bg-primary shadow-md rounded-2xl">
        <thead className="sticky top-0 bg-primary">
          <tr>
            {columns.map((column) => (
              <th
                key={column.accessor}
                className="py-4 px-6 bg-background border-b border-gray-400 text-left text-xs font-medium text-white uppercase tracking-wider"
              >
                {column.header}{" "}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-white hover:text-gray-200">
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="text-gray-300 border-b border-gray-700 hover:bg-gray-600/20 hover:text-white transition-all"
            >
              {columns.map((column) => (
                <td key={column.accessor} className="py-4 px-6">
                  {column.Cell
                    ? column.Cell({ value: row[column.accessor] })
                    : row[column.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReusableTable;
