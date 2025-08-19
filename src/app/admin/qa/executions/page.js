'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ExecutionsPage() {
	const router = useRouter()
	const [loading, setLoading] = useState(false)
	const [results, setResults] = useState([])
	const [page, setPage] = useState(1)
	const [limit] = useState(25)
	const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
	const [statusFilter, setStatusFilter] = useState('')
	const [search, setSearch] = useState('')

	const load = async (nextPage = page) => {
		setLoading(true)
		try {
			const params = new URLSearchParams()
			params.set('page', String(nextPage))
			params.set('limit', String(limit))
			if (search) params.set('testId', search)
			const res = await fetch(`/api/admin/qa/results?${params.toString()}`)
			const data = await res.json()
			if (data.success) {
				let filtered = data.results
				if (statusFilter) filtered = filtered.filter(r => r.status === statusFilter)
				setResults(filtered)
				setPagination(data.pagination)
			}
		} catch (e) {
			console.error('Failed to load executions:', e)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => { load(1) }, [])
	useEffect(() => { load(1) }, [statusFilter])

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Test Executions</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">Detailed history of executed test cases</p>
					</div>
					<button onClick={() => router.push('/admin/qa')} className="text-sm text-blue-600 dark:text-blue-400">← Back to Dashboard</button>
				</div>

				<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
						<input
							value={search}
							onChange={e => setSearch(e.target.value)}
							placeholder="Filter by Test ID"
							className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
						/>
						<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100">
							<option value="">All Statuses</option>
							<option value="passed">Passed</option>
							<option value="failed">Failed</option>
						</select>
						<button onClick={() => load(1)} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm">Apply</button>
						<button onClick={() => { setSearch(''); setStatusFilter(''); load(1) }} className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm">Clear</button>
					</div>
				</div>

				<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
					{loading && (
						<div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
					)}
					{!loading && results.length === 0 && (
						<div className="p-6 text-sm text-gray-500 dark:text-gray-400">No executions found.</div>
					)}
					{!loading && results.map((r, i) => (
						<details key={i} className="p-4">
							<summary className="cursor-pointer flex items-center justify-between">
								<div className="flex-1 min-w-0">
									<div className="font-medium text-gray-900 dark:text-gray-100 truncate">{r.testCase?.title}</div>
									<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										#{r.testCase?.testId} • {r.testCase?.testType} • priority {r.testCase?.priority} • {new Date(r.runAt).toLocaleString()}
									</div>
								</div>
								<span className={`ml-3 px-2 py-0.5 rounded text-xs ${r.status === 'passed' ? 'bg-green-100 text-green-700' : r.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
							</summary>
							<div className="mt-3 text-xs space-y-3">
								<div className="text-gray-600 dark:text-gray-300">Duration: {r.duration}ms</div>
								{r.errors && r.errors.length > 0 && (
									<div className="text-red-600 dark:text-red-400">Errors: {JSON.stringify(r.errors)}</div>
								)}
								{r.logs && r.logs.length > 0 && (
									<div className="text-gray-700 dark:text-gray-200">
										<div className="font-medium mb-1">Steps:</div>
										<ol className="list-decimal list-inside space-y-1">
											{r.logs.map((l, idx) => (
												<li key={idx}>{typeof l === 'object' ? `${l.step || JSON.stringify(l)}${l.status ? ` – ${l.status}` : ''}` : String(l)}</li>
											))}
										</ol>
									</div>
								)}
							</div>
						</details>
					))}
				</div>

				<div className="mt-6 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
					<div>Page {pagination.page} of {pagination.totalPages} ({pagination.total} results)</div>
					<div className="space-x-2">
						<button onClick={() => { if (page > 1) { setPage(page - 1); load(page - 1) } }} disabled={page <= 1} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50">Previous</button>
						<button onClick={() => { if (page < pagination.totalPages) { setPage(page + 1); load(page + 1) } }} disabled={page >= pagination.totalPages} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50">Next</button>
					</div>
				</div>
			</div>
		</div>
	)
}
