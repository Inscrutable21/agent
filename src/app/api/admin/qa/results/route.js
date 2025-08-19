import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

export async function GET(request) {
	try {
		const { searchParams } = new URL(request.url)
		const limitParam = parseInt(searchParams.get('limit') || '25', 10)
		const pageParam = parseInt(searchParams.get('page') || '1', 10)
		const limit = Math.min(100, Math.max(1, limitParam))
		const page = Math.max(1, pageParam)
		const skip = (page - 1) * limit
		const testId = searchParams.get('testId')

		const where = testId ? { testCase: { testId } } : {}

		const [total, results] = await Promise.all([
			prisma.qATestResult.count({ where }),
			prisma.qATestResult.findMany({
				where,
				orderBy: { runAt: 'desc' },
				skip,
				take: limit,
				include: {
					testCase: {
						select: {
							id: true,
							testId: true,
							title: true,
							priority: true,
							testType: true,
							component: true
						}
					}
				}
			})
		])

		return NextResponse.json({ 
			success: true, 
			results,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.max(1, Math.ceil(total / limit))
			}
		})
	} catch (error) {
		console.error('Fetch execution results error:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch execution results', details: error.message },
			{ status: 500 }
		)
	}
} 