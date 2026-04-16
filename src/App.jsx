import { useState } from 'react'
import InputView from './components/InputView'
import TableView from './components/TableView'

export default function App() {
  const [tableData, setTableData] = useState(null)

  function handleConverted(data, columns, filename) {
    setTableData({ data, columns, filename })
  }

  function handleNewConversion() {
    setTableData(null)
  }

  if (tableData) {
    return <TableView {...tableData} onNewConversion={handleNewConversion} />
  }
  return <InputView onConverted={handleConverted} />
}
